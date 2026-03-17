/**
 * Pipeline Version Registry
 *
 * Every scan event stores these versions so we can:
 *   - Compare accuracy across pipeline changes
 *   - Bisect regressions to specific versions
 *   - Know which rules/taxonomy/model were active for a given scan
 *
 * Bump these whenever you change the corresponding module.
 */

/** Overall pipeline version — bump on any breaking change to flow */
export const PIPELINE_VERSION = "2.0.0";

/** Taxonomy version — bump when food-taxonomy rules change */
export const TAXONOMY_VERSION = "1.0.0";

/** Parser version — bump when parsing rules change */
export const PARSER_VERSION = "2.0.0";

/** Ontology version — bump when food-ontology/synonyms change */
export const ONTOLOGY_VERSION = "3.0.0";

export function getPipelineVersions() {
  return {
    pipeline: PIPELINE_VERSION,
    taxonomy: TAXONOMY_VERSION,
    parser: PARSER_VERSION,
    ontology: ONTOLOGY_VERSION,
  };
}
