#!/usr/bin/env Rscript

# Reconstruct Gupta et al. 2014 ZFModels from the published supplementary
# one-finger / two-finger B1H training set, then score the retained Bhakta 2013
# exact L6+R6 activity cohort. This is research-only and does not alter v3.
#
# Sources:
#   Gupta et al. 2014, DOI 10.1093/nar/gku132
#   Bhakta et al. 2013, DOI 10.1101/gr.143693.112

suppressPackageStartupMessages({
  library(jsonlite)
  library(randomForest)
})

args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 2) {
  stop("Usage: Rscript scripts/benchmark-zfmodels-2014.R <Gupta-File009.txt> <Bhakta-L6R6.json>")
}
training_path <- args[[1]]
cohort_path <- args[[2]]

BASES <- c("A", "C", "G", "T")
EPS <- 1e-9

parse_pfm_rows <- function(rows, width) {
  pfm <- matrix(NA_real_, nrow = 4, ncol = width, dimnames = list(BASES, NULL))
  for (i in seq_along(BASES)) {
    pieces <- strsplit(rows[[i]], "\\|", fixed = FALSE)[[1]]
    if (length(pieces) != 2 || trimws(pieces[[1]]) != BASES[[i]]) {
      stop(sprintf("Malformed PFM row: %s", rows[[i]]))
    }
    values <- as.numeric(strsplit(trimws(pieces[[2]]), "[[:space:]]+")[[1]])
    if (length(values) != width || any(!is.finite(values))) {
      stop(sprintf("Expected %d PFM values in: %s", width, rows[[i]]))
    }
    pfm[i, ] <- values
  }
  pfm
}

parse_module_section <- function(lines, header, determinant_width, motif_width) {
  section_starts <- which(trimws(lines) == header)
  if (length(section_starts) != 1) stop(sprintf("Missing or duplicate section: %s", header))
  start <- section_starts[[1]] + 1
  later_headers <- which(seq_along(lines) > start & grepl("^[12] Finger modules$", trimws(lines)))
  end <- if (length(later_headers)) later_headers[[1]] - 1 else length(lines)
  section <- lines[start:end]

  records <- list()
  i <- 1
  while (i <= length(section)) {
    if (!nzchar(trimws(section[[i]]))) {
      i <- i + 1
      next
    }
    if (i + 6 > length(section)) stop(sprintf("Truncated record near %s", section[[i]]))
    name <- trimws(section[[i]])
    determinants <- trimws(section[[i + 1]])
    helices <- trimws(section[[i + 2]])
    if (nchar(determinants) != determinant_width) {
      stop(sprintf("Unexpected determinant width for %s: %s", name, determinants))
    }
    pfm <- parse_pfm_rows(section[(i + 3):(i + 6)], motif_width)
    records[[length(records) + 1]] <- list(
      name = name,
      determinants = determinants,
      helices = helices,
      pfm = pfm
    )
    i <- i + 7
  }
  records
}

chars <- function(x) strsplit(x, "", fixed = TRUE)[[1]]

determinants4 <- function(helix) {
  aa <- chars(helix)
  if (length(aa) != 7) stop(sprintf("Expected 7-aa recognition helix: %s", helix))
  paste0(aa[c(1, 3, 4, 7)], collapse = "") # -1, +2, +3, +6
}

make_predictor_frame <- function(strings, n_features, levels) {
  mat <- t(vapply(strings, function(value) {
    aa <- chars(value)
    if (length(aa) != n_features) stop(sprintf("Expected %d determinants: %s", n_features, value))
    aa
  }, character(n_features)))
  frame <- as.data.frame(mat, stringsAsFactors = FALSE)
  names(frame) <- paste0("X", seq_len(n_features))
  for (name in names(frame)) frame[[name]] <- factor(frame[[name]], levels = levels)
  frame
}

train_zfmodels <- function(records, motif_width, seed) {
  determinant_width <- nchar(records[[1]]$determinants)
  det_strings <- vapply(records, `[[`, character(1), "determinants")
  all_levels <- sort(unique(unlist(lapply(det_strings, chars))))
  # Include all canonical residues so a Bhakta determinant absent at one training
  # position is still a legal factor level at prediction time.
  all_levels <- sort(unique(c(all_levels, chars("ACDEFGHIKLMNPQRSTVWYX"))))
  x <- make_predictor_frame(det_strings, determinant_width, all_levels)
  mtry <- max(1L, floor(determinant_width / 3)) # R randomForest regression default
  models <- vector("list", motif_width)
  set.seed(seed)
  for (position in seq_len(motif_width)) {
    models[[position]] <- vector("list", 4)
    for (base_index in seq_len(4)) {
      y <- vapply(records, function(record) record$pfm[base_index, position], numeric(1))
      models[[position]][[base_index]] <- randomForest(
        x = x,
        y = y,
        ntree = 500,
        mtry = mtry,
        keep.forest = TRUE
      )
    }
  }
  list(
    models = models,
    levels = all_levels,
    determinant_width = determinant_width,
    motif_width = motif_width,
    n = length(records),
    mtry = mtry
  )
}

predict_raw_pfm <- function(model, determinant_string) {
  x <- make_predictor_frame(determinant_string, model$determinant_width, model$levels)
  result <- matrix(NA_real_, nrow = 4, ncol = model$motif_width, dimnames = list(BASES, NULL))
  for (position in seq_len(model$motif_width)) {
    for (base_index in seq_len(4)) {
      result[base_index, position] <- predict(model$models[[position]][[base_index]], newdata = x)
    }
  }
  result
}

normalize_pfm <- function(pfm) {
  pfm[!is.finite(pfm)] <- 0
  pfm <- pmax(pfm, 0)
  sums <- colSums(pfm)
  for (j in seq_len(ncol(pfm))) {
    if (!is.finite(sums[[j]]) || sums[[j]] <= 0) pfm[, j] <- 0.25
    else pfm[, j] <- pfm[, j] / sums[[j]]
  }
  pfm
}

predict_one_finger_array <- function(model, helices_ntoc) {
  # C2H2 arrays bind antiparallel; DNA 5'->3' order is reverse protein N->C.
  blocks <- lapply(rev(helices_ntoc), function(helix) {
    normalize_pfm(predict_raw_pfm(model, determinants4(helix)))
  })
  do.call(cbind, blocks)
}

predict_two_finger_array <- function(model, helices_ntoc) {
  n <- length(helices_ntoc)
  if (n < 2) stop("Two-finger model requires >=2 fingers")
  pair_pfm <- function(i) {
    det <- paste0(determinants4(helices_ntoc[[i]]), determinants4(helices_ntoc[[i + 1]]))
    normalize_pfm(predict_raw_pfm(model, det))
  }
  # Training records are F2-F3 in protein order, while their PFM columns are
  # F3 then F2 in DNA 5'->3' order. Start with the C-terminal pair and stitch
  # successive overlapping 3-bp subsites as described by Gupta et al. 2014.
  result <- pair_pfm(n - 1)
  if (n > 2) {
    for (i in seq(n - 2, 1)) {
      next_pair <- pair_pfm(i)
      result[, (ncol(result) - 2):ncol(result)] <-
        (result[, (ncol(result) - 2):ncol(result), drop = FALSE] +
           next_pair[, 1:3, drop = FALSE]) / 2
      result <- cbind(result, next_pair[, 4:6, drop = FALSE])
    }
  }
  normalize_pfm(result)
}

hybrid_pfm <- function(one, two) normalize_pfm((one + two) / 2)

score_target <- function(pfm, target) {
  if (ncol(pfm) != nchar(target)) stop("PFM/target length mismatch")
  target_bases <- chars(target)
  log_probs <- vapply(seq_along(target_bases), function(i) {
    log(max(pfm[target_bases[[i]], i], EPS))
  }, numeric(1))
  triplet_means <- vapply(seq(1, length(log_probs), by = 3), function(i) {
    mean(log_probs[i:(i + 2)])
  }, numeric(1))
  list(mean_log_fit = mean(log_probs), weakest_triplet = min(triplet_means))
}

auc_numeric <- function(labels, scores) {
  pos <- which(labels)
  neg <- which(!labels)
  credit <- 0
  for (i in pos) for (j in neg) {
    delta <- scores[[i]] - scores[[j]]
    credit <- credit + if (delta > 0) 1 else if (delta == 0) 0.5 else 0
  }
  credit / (length(pos) * length(neg))
}

auc_lexicographic <- function(labels, primary, secondary) {
  pos <- which(labels)
  neg <- which(!labels)
  credit <- 0
  for (i in pos) for (j in neg) {
    delta_primary <- primary[[i]] - primary[[j]]
    delta <- if (delta_primary != 0) delta_primary else secondary[[i]] - secondary[[j]]
    credit <- credit + if (delta > 0) 1 else if (delta == 0) 0.5 else 0
  }
  credit / (length(pos) * length(neg))
}

summarize_scores <- function(rows, score_name) {
  labels <- vapply(rows, `[[`, logical(1), "active")
  b <- vapply(rows, `[[`, numeric(1), "combinedBScore")
  s <- vapply(rows, function(row) row[[score_name]], numeric(1))
  list(
    n = length(rows),
    active = sum(labels),
    auc = auc_numeric(labels, s),
    b_score_auc = auc_numeric(labels, b),
    b_then_score_auc = auc_lexicographic(labels, b, s)
  )
}

lines <- readLines(training_path, warn = FALSE)
two_records <- parse_module_section(lines, "2 Finger modules", 8, 6)
one_records <- parse_module_section(lines, "1 Finger modules", 4, 3)

if (length(two_records) != 678) stop(sprintf("Expected 678 two-finger modules, found %d", length(two_records)))
if (length(one_records) != 1209) stop(sprintf("Expected 1209 one-finger modules, found %d", length(one_records)))

one_model <- train_zfmodels(one_records, motif_width = 3, seed = 201401)
two_model <- train_zfmodels(two_records, motif_width = 6, seed = 201402)

cohort <- fromJSON(cohort_path, simplifyVector = FALSE)$rows
scored <- lapply(cohort, function(row) {
  left_one <- predict_one_finger_array(one_model, row$leftHelicesNtoC)
  right_one <- predict_one_finger_array(one_model, row$rightHelicesNtoC)
  left_two <- predict_two_finger_array(two_model, row$leftHelicesNtoC)
  right_two <- predict_two_finger_array(two_model, row$rightHelicesNtoC)
  left_hybrid <- hybrid_pfm(left_one, left_two)
  right_hybrid <- hybrid_pfm(right_one, right_two)

  arm_pair <- function(left_pfm, right_pfm) {
    left <- score_target(left_pfm, row$leftRecognition)
    right <- score_target(right_pfm, row$rightRecognition)
    list(
      mean = mean(c(left$mean_log_fit, right$mean_log_fit)),
      weakest = min(c(left$weakest_triplet, right$weakest_triplet))
    )
  }
  one <- arm_pair(left_one, right_one)
  two <- arm_pair(left_two, right_two)
  hybrid <- arm_pair(left_hybrid, right_hybrid)

  list(
    target = row$target,
    cohort = row$cohort,
    active = row$active,
    combinedBScore = row$combinedBScore,
    one_mean = one$mean,
    one_weakest = one$weakest,
    two_mean = two$mean,
    two_weakest = two$weakest,
    hybrid_mean = hybrid$mean,
    hybrid_weakest = hybrid$weakest
  )
})

eligible <- Filter(function(row) row$combinedBScore >= 15, scored)
methods <- c("one_mean", "two_mean", "hybrid_mean", "one_weakest", "two_weakest", "hybrid_weakest")

result <- list(
  source = list(
    firstAuthor = "Gupta",
    year = 2014,
    doi = "10.1093/nar/gku132",
    training = list(
      one_finger_n = one_model$n,
      two_finger_n = two_model$n,
      one_finger_mtry = one_model$mtry,
      two_finger_mtry = two_model$mtry,
      trees_per_output = 500
    )
  ),
  cohort = list(firstAuthor = "Bhakta", year = 2013, doi = "10.1101/gr.143693.112"),
  note = "Independent reimplementation of the published RF specification using R randomForest and the published supplementary training set; not the authors' serialized web-server model.",
  primary_predeclared_score = "hybrid_mean",
  full_21 = setNames(lapply(methods, function(method) summarize_scores(scored, method)), methods),
  v3_eligible_b_ge_15 = setNames(lapply(methods, function(method) summarize_scores(eligible, method)), methods),
  rows = scored
)

cat(toJSON(result, auto_unbox = TRUE, pretty = TRUE, digits = 10), "\n")
