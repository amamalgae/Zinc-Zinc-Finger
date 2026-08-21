#!/usr/bin/env Rscript

# Source-model validation for the Gupta et al. 2014 ZFModels reconstruction.
# Uses only the published B1H training data and RF out-of-bag predictions;
# Bhakta ZFN activity labels are never used here.
# Gupta et al. 2014, DOI 10.1093/nar/gku132.

suppressPackageStartupMessages({
  library(jsonlite)
  library(randomForest)
})

args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 1) stop("Usage: Rscript scripts/validate-zfmodels-oob.R <Gupta-File009.txt>")
training_path <- args[[1]]
BASES <- c("A", "C", "G", "T")

parse_pfm_rows <- function(rows, width) {
  pfm <- matrix(NA_real_, nrow = 4, ncol = width, dimnames = list(BASES, NULL))
  for (i in seq_along(BASES)) {
    pieces <- strsplit(rows[[i]], "\\|", fixed = FALSE)[[1]]
    if (length(pieces) != 2 || trimws(pieces[[1]]) != BASES[[i]]) stop("Malformed PFM row")
    values <- as.numeric(strsplit(trimws(pieces[[2]]), "[[:space:]]+")[[1]])
    if (length(values) != width || any(!is.finite(values))) stop("Malformed PFM values")
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
    if (!nzchar(trimws(section[[i]]))) { i <- i + 1; next }
    if (i + 6 > length(section)) stop("Truncated record")
    determinants <- trimws(section[[i + 1]])
    if (nchar(determinants) != determinant_width) stop("Unexpected determinant width")
    records[[length(records) + 1]] <- list(
      determinants = determinants,
      pfm = parse_pfm_rows(section[(i + 3):(i + 6)], motif_width)
    )
    i <- i + 7
  }
  records
}

chars <- function(x) strsplit(x, "", fixed = TRUE)[[1]]

make_predictor_frame <- function(strings, n_features, levels) {
  mat <- t(vapply(strings, function(value) {
    aa <- chars(value)
    if (length(aa) != n_features) stop("Unexpected determinant length")
    aa
  }, character(n_features)))
  frame <- as.data.frame(mat, stringsAsFactors = FALSE)
  names(frame) <- paste0("X", seq_len(n_features))
  for (name in names(frame)) frame[[name]] <- factor(frame[[name]], levels = levels)
  frame
}

validate_oob <- function(records, motif_width, seed) {
  determinant_width <- nchar(records[[1]]$determinants)
  det_strings <- vapply(records, `[[`, character(1), "determinants")
  levels <- sort(unique(c(unlist(lapply(det_strings, chars)), chars("ACDEFGHIKLMNPQRSTVWYX"))))
  x <- make_predictor_frame(det_strings, determinant_width, levels)
  mtry <- max(1L, floor(determinant_width / 3))
  n <- length(records)
  observed <- array(NA_real_, dim = c(n, 4, motif_width))
  predicted <- array(NA_real_, dim = c(n, 4, motif_width))
  for (i in seq_len(n)) observed[i, , ] <- records[[i]]$pfm

  set.seed(seed)
  for (position in seq_len(motif_width)) {
    for (base_index in seq_len(4)) {
      y <- observed[, base_index, position]
      model <- randomForest(x = x, y = y, ntree = 500, mtry = mtry, keep.forest = FALSE)
      predicted[, base_index, position] <- model$predicted
    }
  }

  squared <- (predicted - observed)^2
  record_mse <- vapply(seq_len(n), function(i) mean(squared[i, , ], na.rm = TRUE), numeric(1))
  list(
    n = n,
    determinant_width = determinant_width,
    motif_width = motif_width,
    trees_per_output = 500,
    mtry = mtry,
    mean_record_mse = mean(record_mse),
    median_record_mse = median(record_mse),
    pooled_mse = mean(squared, na.rm = TRUE),
    q25_record_mse = unname(quantile(record_mse, 0.25)),
    q75_record_mse = unname(quantile(record_mse, 0.75))
  )
}

lines <- readLines(training_path, warn = FALSE)
two <- parse_module_section(lines, "2 Finger modules", 8, 6)
one <- parse_module_section(lines, "1 Finger modules", 4, 3)
if (length(two) != 678 || length(one) != 1209) stop("Unexpected training-set size")

result <- list(
  source = list(firstAuthor = "Gupta", year = 2014, doi = "10.1093/nar/gku132"),
  validation = "randomForest out-of-bag predictions; independent of all ZFN activity labels",
  published_reference = list(
    method = "paper reports 10-fold cross-validation, not OOB",
    two_finger_mean_mse = 0.017,
    two_finger_median_mse = 0.009
  ),
  one_finger_oob = validate_oob(one, 3, 201401),
  two_finger_oob = validate_oob(two, 6, 201402)
)
cat(toJSON(result, auto_unbox = TRUE, pretty = TRUE, digits = 10), "\n")
