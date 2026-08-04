import TextArea from '../Forms/TextArea'
import { Input } from 'antd'

/**
 * Maps required metadata fields
 * @param {'dna'|'chemical'|'signal'} type Field type
 */
const getFieldParams = (type) => {
  switch (type) {
    case 'dna':
      return {
        url: 'dna/',
        buttonCreateLabel: 'DNA',
        createFields: [
          {
            name: 'name',
            label: 'Name',
            showLabel: true,
            rules: [{ required: true }],
            style: { width: '100%' },
          },
          {
            name: 'sboluri',
            label: 'SBOL Uri',
            showLabel: true,
            style: { width: '100%' },
            rules: [{ type: 'url' }],
          },
        ],
      }
    case 'chemical':
      return {
        url: 'chemical/',
        buttonCreateLabel: 'chemical',
        createFields: [
          {
            name: 'name',
            label: 'Name',
            showLabel: true,
            rules: [{ required: true }],
            style: { width: '100%' },
          },
          {
            name: 'pubchemid',
            label: 'PubChem ID',
            type: 'number',
            rules: [{ required: false }],
            renderer: Input,
          },
          {
            name: 'description',
            label: 'Description',
            showLabel: true,
            rules: [{ required: true }],
            RenderField: TextArea,
          },
        ],
      }
    case 'signal':
      return {
        url: 'signal/',
        buttonCreateLabel: 'Signal',
        createFields: [
          {
            name: 'name',
            label: 'Name',
            showLabel: true,
            rules: [{ required: true }],
          },
          {
            name: 'description',
            label: 'Description',
            showLabel: true,
            rules: [{ required: true }],
            RenderField: TextArea,
          },
          {
            name: 'color',
            label: 'Color',
            showLabel: true,
            rules: [{ required: true }],
          },
        ],
      }
    default:
      return null
  }
}

export default getFieldParams
