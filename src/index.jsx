import React from 'react'
import {render} from 'react-dom'
import d3 from 'd3'
import kuromoji from 'kuromoji'
import Graph from 'egraph/graph'
import SugiyamaLayouter from 'egraph/layouter/sugiyama'

const jaccard = (set1, set2) => {
  let count = 0
  for (const item of set1) {
    if (set2.has(item)) {
      count += 1
    }
  }
  return count / (set1.size + set2.size - count)
}

class App extends React.Component {
  render () {
    const textHeight = 20
    const {graph} = this.props
    const layouter = new SugiyamaLayouter()
      .vertexWidth(() => 1000)
      .vertexHeight(({d}) => textHeight * d.texts.length)
      .layerMargin(200)
    const {vertices, edges} = layouter.layout(graph)
    const left = Math.min(...graph.vertices().map((u) => vertices[u].x - vertices[u].width / 2))
    const right = Math.max(...graph.vertices().map((u) => vertices[u].x + vertices[u].width / 2))
    const top = Math.min(...graph.vertices().map((u) => vertices[u].y - vertices[u].height / 2))
    const bottom = Math.max(...graph.vertices().map((u) => vertices[u].y + vertices[u].height / 2))
    const width = right - left
    const height = bottom - top
    const margin = 10
    const line = d3.svg.line()
      .x((d) => d[0])
      .y((d) => d[1])
    console.log(vertices, edges, width, height)
    return <div>
      <svg width={width + margin * 2} height={height + margin * 2}>
        <g transform={`translate(${margin},${margin})`}>
          <g>
            {graph.vertices().map((u) => {
              const {x, y, width, height} = vertices[u]
              return <g transform={`translate(${x - width / 2},${y - height / 2})`}>
                <rect width={width} height={height} fill='mintcream' stroke='black' />
                {graph.vertex(u).texts.map((text, i) => {
                  return <text y={textHeight * i + 16}>
                    {text}
                  </text>
                })}
              </g>
            })}
          </g>
          <g>
            {graph.edges().map(([u, v]) => {
              const {points} = edges[u] && edges[u][v] ? edges[u][v] : edges[v][u]
              return <g>
                <path d={line(points)} stroke='black' fill='none' />
              </g>
            })}
          </g>
        </g>
      </svg>
    </div>
  }
}

const connectedComponents = (graph) => {
  const groups = new Map()
  const components = []
  for (const u of graph.vertices()) {
    if (groups.has(u)) {
      continue
    }
    const component = []
    const key = components.length
    const queue = [u]
    while (queue.length > 0) {
      const v = queue.shift()
      if (groups.has(v)) {
        continue
      }
      groups.set(v, key)
      component.push(v)
      for (const w of graph.outVertices(v)) {
        queue.push(w)
      }
    }
    components.push(component)
  }
  return {components, groups}
}

const mergeGraph = (graph, relations) => {
  const {groups, components} = connectedComponents(graph)
  const mergedGraph = new Graph()
  components.forEach((component, i) => {
    mergedGraph.addVertex(i, {
      texts: component.map((text) => {
        const {origIndex, index} = graph.vertex(text)
        return `${origIndex}${index} ${text}`
      })
    })
  })
  for (const relation of relations) {
    const u = groups.get(relation.reason)
    const v = groups.get(relation.result)
    if (!mergedGraph.edge(u, v) && u !== v) {
      mergedGraph.addEdge(u, v, {
      })
    }
  }
  return mergedGraph
}

kuromoji.builder({dicPath: 'dict'}).build((_, tokenizer) => {
  d3.csv('data.csv', (data) => {
    const texts = new Map()
    for (const item of data) {
      texts.set(item.reason, {
        text: item.reason,
        origIndex: item.index,
        index: item.reasonIndex
      })
      texts.set(item.result, {
        text: item.result,
        origIndex: item.index,
        index: item.resultIndex
      })
    }
    const textWords = new Map()
    for (const text of texts.keys()) {
      textWords.set(text, new Set(tokenizer.tokenize(text)
        .filter((word) => ['名詞', '動詞', '形容詞', '形容動詞'].includes(word.pos) && word.basic_form !== '*')
        .map((word) => word.basic_form)))
    }
    console.log(textWords)
    const graph = new Graph()
    for (const [text, {origIndex, index}] of texts.entries()) {
      graph.addVertex(text, {
        text,
        origIndex,
        index,
        words: textWords.get(text)
      })
    }
    for (const text1 of texts.keys()) {
      const words1 = textWords.get(text1)
      for (const text2 of texts.keys()) {
        const words2 = textWords.get(text2)
        if (jaccard(words1, words2) >= 0.4 && text1 !== text2) {
          graph.addEdge(text1, text2, {
          })
        }
      }
    }
    render(<App graph={mergeGraph(graph, data)} />, document.getElementById('content'))
  })
})
