import React, { Component } from 'react';
import ChartTypeDropDown from './ChartTypeDropDown';

const data = {
    values: [
        {x: 'A', y: 1},
        {x: 'B', y: 2},
        {x: 'C', y: 3},
        {x: 'D', y: 4},
        {x: 'E', y: 5},
      ],
  };


  class HandleChartTypeChange extends Component {

    constructor(props) {
        super(props);
        this.state = {
          chartType: 'default',
          spec: {
            mark: 'bar',
            encoding: {
              x: {field: 'x', type: 'ordinal'},
              y: {field: 'y', type: 'quantitative'},
            },
          },
        };
      }

    shouldComponentUpdate(nextProps, nextState) {
        return this.state.chartType !== nextState.chartType || this.state.spec !== nextState.spec;
      }
    
    componentDidUpdate(prevProps, prevState) {
        // check if the chart type or specification has changed
        if (this.state.chartType !== prevState.chartType || this.state.spec !== prevState.spec) {
          // update the chart based on the new chart type and specification
          // for example, using the VegaLite API:
          // vegaEmbed('#chart', this.state.spec);
        }
      }
    
      handleChartTypeChange = value => {
        this.setState({ chartType: value });
    
        if (value === 'bar-chart') {
          this.setState({
            spec: {
              mark: 'bar',
              encoding: {
                x: {field: 'x', type: 'ordinal'},
                y: {field: 'y', type: 'quantitative'},
              },
            },
          });
        } else if (value === 'line-chart') {
          this.setState({
            spec: {
              mark: 'line',
              encoding: {
                x: {field: 'x', type: 'ordinal'},
                y: {field: 'y', type: 'quantitative'},
              },
            },
          });
        } else {
          this.setState({
            spec: {
              mark: 'point',
              encoding: {
                x: {field: 'x', type: 'ordinal'},
                y: {field: 'y', type: 'quantitative'},
              },
            },
          });
        }
      }  

      render() {
        return (
          <div>
            <ChartTypeDropdown onChartTypeChange={this.handleChartTypeChange} />
            <div id="chart">
            </div>
          </div>
        );
      }
  }

  
  
  export default HandleChartTypeChange;