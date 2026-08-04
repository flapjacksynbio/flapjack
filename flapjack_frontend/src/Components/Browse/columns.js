import { compareText, renderSbolUri, renderDoi } from './helpers'

/**
 * Shared Ant Design column definitions for the Browse tables.
 *
 * These were duplicated across the six panels, which let labels drift: "Id"
 * against "ID", and "Sbol Uris" against "SBOL URI". Defining them once means a
 * terminology change is one edit rather than six.
 */

export const nameColumn = (title = 'Name') => ({
  title,
  key: 'name',
  dataIndex: 'name',
  sorter: (a, b) => compareText(a.name, b.name),
})

export const idColumn = () => ({
  title: 'ID',
  key: 'id',
  dataIndex: 'id',
})

export const descriptionColumn = () => ({
  title: 'Description',
  key: 'desc',
  dataIndex: 'description',
})

export const sbolUriColumn = (title = 'SBOL URI') => ({
  title,
  key: 'sboluri',
  dataIndex: 'sboluri',
  render: renderSbolUri,
})

export const doiColumn = () => ({
  title: 'DOI',
  key: 'doi',
  dataIndex: 'doi',
  sorter: (a, b) => compareText(a.doi, b.doi),
  render: renderDoi,
})

/** Width fits two pill buttons; Space wraps if a panel adds a third. */
export const actionsColumn = (render) => ({
  title: 'Actions',
  key: 'actions',
  render,
  width: 260,
})
