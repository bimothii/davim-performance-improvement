import React, { Component } from 'react'


class ChartTypeDropDown extends Component {

  constructor(props) {
    super(props)
    this.state = {
       chartType : 'dafualt'
    };
  }

  handleChange = event => {
    this.setState({chartType: event.target.value });
    console.log(this.state.chartType)
    this.props.onChartTypeChange(event.target.value);
  }

  render() {
    return (
      <div className='chart-type-dropdown'>
        <label htmlFor="chart-type">Chart Type:</label>
        <select name="chart-type" id="chart-type" value={this.state.chartType} onChange={this.handleChange}>
          <option value="default">Default</option>
          <option value="bar-chart">Bar Chart</option>
          <option value="line-chart">Line Chart</option>
        </select>
      </div>
    )
  }
}

export default ChartTypeDropDown