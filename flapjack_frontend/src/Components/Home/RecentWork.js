import React from 'react'
import { Link } from 'react-router-dom'
import { Card, List, Skeleton, Empty, Typography } from 'antd'
import api from '../../api'

const LIMIT = 5

const RecentWork = () => {
  const [studies, setStudies] = React.useState(null)
  const [assays, setAssays] = React.useState(null)

  React.useEffect(() => {
    let live = true
    const load = (url, set) =>
      api
        .get(url, {}, { limit: LIMIT, ordering: '-id' })
        .then(({ results }) => live && set(results || []))
        .catch(() => live && set([]))
    load('study/', setStudies)
    load('assay/', setAssays)
    return () => {
      live = false
    }
  }, [])

  const panel = (title, items, toFor, emptyText) => (
    <Card title={title} className="recent-card">
      {items === null ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
      ) : (
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item>
              <Link to={toFor(item)}>{item.name}</Link>
              {item.description ? (
                <Typography.Text type="secondary" ellipsis>
                  {item.description}
                </Typography.Text>
              ) : null}
            </List.Item>
          )}
        />
      )}
    </Card>
  )

  return (
    <div className="recent-work">
      {panel('Recent studies', studies, (s) => `/view?study=${s.id}`, 'No studies yet')}
      {panel('Recent assays', assays, (a) => `/view?assay=${a.id}`, 'No assays yet')}
    </div>
  )
}

export default RecentWork
