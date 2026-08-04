import React from 'react'
import { Select, Spin, App } from 'antd'
import api from '../../api'
import debounce from 'lodash/debounce'

/**
 * Select component that lists Chemicals provided by the API
 */
const ChemicalForm = (props) => {
  const { message } = App.useApp()
  const [chemicals, setChemicals] = React.useState([])
  const [fetching, setFetching] = React.useState(false)
  const lastFetchId = React.useRef(0)

  const fetchChemicals = React.useMemo(
    () =>
      debounce((search) => {
        const fetchId = lastFetchId.current + 1
        lastFetchId.current = fetchId
        setChemicals([])
        setFetching(true)

        api
          .get('chemical/', null, { search })
          .then(({ results }) => {
            if (fetchId !== lastFetchId.current) return
            setChemicals(
              (results || []).map(({ id, name }) => ({ value: id, label: name })),
            )
          })
          .catch(() => {
            if (fetchId !== lastFetchId.current) return
            setChemicals([])
            message.error('There was an error loading chemicals.')
          })
          .finally(() => {
            if (fetchId === lastFetchId.current) setFetching(false)
          })
      }, 300),
    [],
  )

  React.useEffect(() => {
    fetchChemicals('')
    return () => {
      lastFetchId.current += 1
      fetchChemicals.cancel()
    }
  }, [fetchChemicals])

  return (
    <Select
      labelInValue
      placeholder="Select Chemical"
      notFoundContent={fetching ? <Spin size="small" /> : null}
      filterOption={false}
      onSearch={fetchChemicals}
      options={chemicals}
      showSearch
      style={{ width: '100%' }}
      {...props}
    />
  )
}

ChemicalForm.propTypes = {}

export default ChemicalForm
