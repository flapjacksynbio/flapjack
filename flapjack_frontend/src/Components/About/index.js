import React from 'react'
import { Typography, Card } from 'antd'

const { Title, Paragraph } = Typography

const About = () => (
  <div className="page">
    <header className="page-header">
      <Title level={2} className="page-title">
        About Flapjack
      </Title>
      <Paragraph className="page-subtitle">
        A tool for managing, analyzing, and visualizing synthetic biology experiment data.
      </Paragraph>
    </header>
    <Card>
      <Paragraph>
        Originally developed by Rudge Lab, Newcastle University. Maintained since 2026 by{' '}
        <a href="https://geneticlogiclab.org/" target="_blank" rel="noopener noreferrer">
          Genetic Logic Lab
        </a>
        , University of Colorado Boulder.
      </Paragraph>
      <Title level={3}>Citation</Title>
      <Paragraph>
        If you use Flapjack in your research, please cite our{' '}
        <a
          href="https://pubs.acs.org/doi/10.1021/acssynbio.0c00554"
          target="_blank"
          rel="noopener noreferrer"
        >
          paper
        </a>
        :
      </Paragraph>
      <blockquote
        style={{ borderLeft: '3px solid #d9d9d9', margin: '0', paddingLeft: '16px' }}
      >
        <Paragraph style={{ marginBottom: 0 }}>
          Guillermo Yáñez Feliú, Benjamín Earle Gómez, Verner Codoceo Berrocal, Macarena
          Muñoz Silva, Isaac N. Nuñez, Tamara F. Matute, Anibal Arce Medina, Gonzalo
          Vidal, Carolus Vitalis, Jonathan Dahlin, Fernán Federici, and Timothy J. Rudge.{' '}
          <em>ACS Synthetic Biology</em> <strong>2021</strong>, <em>10</em> (1), 183–191.
          DOI:{' '}
          <a
            href="https://pubs.acs.org/doi/10.1021/acssynbio.0c00554"
            target="_blank"
            rel="noopener noreferrer"
          >
            10.1021/acssynbio.0c00554
          </a>
        </Paragraph>
      </blockquote>
    </Card>
  </div>
)

export default About
