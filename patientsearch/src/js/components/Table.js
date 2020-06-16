import React, {Component} from "react";
import ReactTable from 'react-table-6';
import 'react-table-6/react-table.css';
import Box from '@material-ui/core/Box';
import Link from '@material-ui/core/Link';
import Typography from '@material-ui/core/Typography';
import {sendRequest, dateFormat} from './Utility';
import Error from './Error';
import Profile from './Profile';

export default class Table extends Component {
   constructor() {
      super();
      this.state = {
        data: [],
        loading: true,
        pages: 0,
        total: 0,
        hasError: false,
        errorMessage: "",
        currentPatient: {}
      };
  }
  componentDidMount() {
    this.getData();
  }
  getData() {
    sendRequest("./Patient").then(response => {
      let rawData = {};
      if (response) {
        rawData = JSON.parse(response);
      }
      let dataSet = [];
      if (rawData["entry"]) {   
        (rawData["entry"]).forEach(function(item) {
            var nameNode = item.resource && item.resource.name ? item.resource.name[0] : null;
            var firstName = nameNode && nameNode.given ? nameNode.given: "";
            var lastName = nameNode && nameNode.family ? nameNode.family: "";
            var fullName = [firstName, lastName].join(" ");
            var telecomeNode = item.resource && item.resource.telecom? item.resource.telecom : null;
            var email = "";
            var lastUpdated = item.resource && item.resource.meta && item.resource.meta["lastUpdated"] ? dateFormat(item.resource.meta["lastUpdated"]) : "--";
            if (telecomeNode) {
                telecomeNode.forEach(function(item) {
                    if (!email && item.system == "email") {
                        email = item.value;
                    }
                });
            }
            dataSet.push({
                id: item.resource.id,
                name: fullName,
                email: email,
                lastUpdated: lastUpdated
            });
        });
      }
      this.setState({ data: dataSet, total: dataSet.length, loading: false, hasError: false, errorMessage: "" });
    }, error => {
      let errorMessage = error.statusText ? error.statusText: error;
      console.log("Failed ", errorMessage);
      if (error.status && error.status == 401) {
        errorMessage = "You are not yet authorized to use the Dashboard application. Contact the person responsible for granting your access permissions.";
      }
      this.setState({loading: false, hasError: true, errorMessage: errorMessage});
    });
  }
  render() {
      let loadingClass = this.state.loading?'loading':'';
      const cellClass = "mdc-data-table__cell";
      return (
              <div className="accountsList">
                <h2>Accounts List <span className="count">({`${this.state.total} entries`})</span></h2>
                <div className={`tableWrapper ${loadingClass}`}>
                  <div className={`loading ${loadingClass?'':'hide'}`}>
                    <div className="loader"></div>
                  </div>
                  <Error message={this.state.errorMessage} className={`error-message ${this.state.hasError?'show':'hide'}`}></Error>
                  <Profile info={this.state.currentPatient}></Profile>
                  <ReactTable
                      data={this.state.data}
                      columns={[
                            {
                              Header: "ID",
                              accessor: "id",
                              sortable: true,
                              className: `${cellClass}`,
                              maxWidth: 92,
                              sortMethod: (a, b) => {
                                if (a == b) {
                                  return 0;
                                }
                                return parseInt(a) > parseInt(b) ? 1 : -1;
                              }
                            },
                            {
                              Header: "Username",
                              accessor: "email",
                              sortable: true,
                              className: `${cellClass}`
                            },
                            {
                              Header: "Name",
                              accessor: "name",
                              sortable: true,
                              className: `${cellClass}`
                            },
                            {
                              Header: "Last Updated",
                              accessor: "lastUpdated",
                              sortable: true,
                              className: `${cellClass}`,
                              sortMethod: (a, b) => {
                                if (a == null && b != null) {
                                  return 1;
                                } else if (a != null && b == null) {
                                  return -1;
                                } else if (a == null && b == null) {
                                  return 0;
                                }
                                a = new Date(a).getTime();
                                b = new Date(b).getTime();
                                return b > a ? 1 : -1;
                              }
                            }
                          ]}
                          defaultSorted={[
                            {
                              id: "lastUpdated",
                              asc: false
                            }
                          ]}
                          showPagination={true}
                          showPaginationTop={false}
                          showPaginationBottom={true}
                          showPageSizeOptions={true}
                          showPaginationBottom={true}
                          pageSizeOptions={[10, 20, 25, 50, 100]}
                          defaultPageSize={10}
                          sortable={true}
                          resizeable={true}
                          style={{
                            height: "67.5vh" // This will force the table body to overflow and scroll, since there is not enough room
                          }}
                          className="mdc-data-table__table -striped -highlight"
                          getTdProps={(state, rowInfo, column, instance) => {
                            return {
                              onClick: (e, handleOriginal) => {
                                //debugging
                                // console.log("state ", state)
                                // console.log('A Td Element was clicked!')
                                // console.log('it produced this event:', e)
                                // console.log('It was in this column:', column)
                                // console.log('It was in this row:', rowInfo)
                                // console.log('row detail: ', rowInfo.row, ' id:', rowInfo.row.id, ' email:', rowInfo.row.email)
                                // console.log('It was in this table instance:', instance)
                                this.setState({currentPatient: rowInfo.row});
                                document.querySelector("#profilePlaceholderButton").click();
                              }
                            }
                          }}
                          getTheadThProps={(state,rowInfo,column,instance) => {
                            return {
                                tabIndex: 0,
                                onKeyPress: (e, handleOriginal) => {
                                    if(e.which === 13) {
                                        instance.sortColumn(column);
                                        e.stopPropagation();
                                    }
                                }
                            };
                        }}
                  />
                  { !this.state.hasError &&
                    !this.state.loading &&
                    <Box pt={2}>
                          <Typography variant="body2" color="textSecondary" align="right">
                              <Link color="inherit" href="/Patient" target="_blank" rel="noreferrer" className="muted">
                                  View Raw Source
                              </Link>
                          </Typography>
                    </Box>
                  }
                </div>
            </div>
      );
  }
}
