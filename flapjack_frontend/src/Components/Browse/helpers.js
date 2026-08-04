import React from 'react'

/**
 * Null-safe text comparator for Ant Design table sorters.
 * Records with a missing or null value sort as empty strings instead of throwing.
 */
export const compareText = (a, b) => String(a || '').localeCompare(String(b || ''))

/**
 * Null-safe numeric comparator for Ant Design table sorters.
 */
export const compareNumber = (a, b) => Number(a || 0) - Number(b || 0)

const missing = (text) => <span className="browse-uri-empty">{text}</span>

const externalLink = (href, label) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {label}
  </a>
)

/**
 * Renders an SBOL URI as a link to SynBioHub, or a muted placeholder when unset.
 * @param {string} uri Value of the record's `sboluri` field. May be blank.
 */
export const renderSbolUri = (uri) =>
  uri ? externalLink(uri, 'Go to SynBioHub') : missing('No SBOL URI')

/**
 * Renders a DOI as a link, or a muted placeholder when unset.
 * @param {string} doi Value of the record's `doi` field. May be blank.
 */
export const renderDoi = (doi) => (doi ? externalLink(doi, doi) : missing('No DOI'))
