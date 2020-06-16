import React, {Component} from "react";
import PropTypes from 'prop-types';
import InputLabel from '@material-ui/core/InputLabel';
import Divider from '@material-ui/core/Divider';
import Error from './Error';
import {sendRequest, dateFormat} from './Utility';

const NO_TEXT = "not provided";
export default class Demographics extends Component {
    constructor () {
        super(...arguments);
        this.state = {
            coreInfo: {},
            errorMessage: "",
            loading: true
        };
        this.__mounted = false;
    }
    componentWillUnmount() {
        this.__mounted = false;
    }
    setCurrentState(data) {
        if (this.__mounted && data) {
            this.setState(data);
        }
    }
    componentDidMount() {
        this.__mounted = true;
        sendRequest(`./Patient/${this.props.info.id}`).then(response => {
          let rawData = {};
          if (response) {
            try {
                rawData = JSON.parse(response);
            } catch(e) {
                console.log("Error parsing questionnaire json: ", e);
                this.setCurrentState({errorMessage: `Error retrieving demographics data: ${e}; <a href="/">Refresh</a>`, loading: false});
                return;
            }
          }
          if (!rawData) {
            this.setCurrentState({errorMessage: `Error retrieving demographics data: no data returned`, loading: false});
              return false;
          }
          let dataSet = {};
          dataSet["Birth_date"] = rawData.birthDate ? dateFormat(rawData.birthDate) : "";
          dataSet["Gender"] = rawData.gender;
          dataSet.phone = "";
          if (rawData.telecom) {
              const teleResult = (rawData.telecom).filter(item => item.system == "phone");
              if (teleResult.length) {
                dataSet.phone = teleResult[0].value;
              }
          }
          dataSet["Primary_zipcode"] = "";
          if (rawData.address) {
              const homeAddress = (rawData.address).filter(item => item.use == "home");
              if (homeAddress.length) {
                dataSet["Primary_zipcode"] = homeAddress[0].postalCode;
              }
              const secondaryAddress = (rawData.address).filter(item => !item.use);
              if (secondaryAddress.length) {
                dataSet["Secondary_zipcode"] = secondaryAddress[0].postalCode;
              }
          }
          this.setCurrentState({coreInfo: dataSet, errorMessage: "", loading: false});
        }, error => {
          let errorMessage = error.statusText ? error.statusText: error;
          console.log("Failed ", errorMessage);
          //unauthorized error
          if (error.status && error.status == 401) {
            console.log("Failed: Unauthorized ", errorMessage);
            window.location = "/";
            return;
          }
          this.setCurrentState({errorMessage: `Error retrieving demographics data: ${errorMessage}`, loading: false});
        });
      }
    renderProfileLabel(label) {
        return (<InputLabel required={false} shrink={true} className="profile-label">{label.replace(/\_/g, " ")}</InputLabel>);
    }
    renderProfileText(text) {
        return (<span>{text && String(text).trim() ? text: NO_TEXT}</span>);
    }
    render() {
        const {info} = this.props;
        return (
            <div className="demographics-container">
                <div className={this.state.loading?"loading":"hide"}>
                    <div className="loader"></div>
                </div>
                {this.renderProfileLabel("Name")}
                {this.renderProfileText(info.name?info.name:"")}
                <Divider/>
                {this.renderProfileLabel("Email")}
                {this.renderProfileText(info.email?info.email:"")}
                <Divider />
                {

                    Object.entries(this.state.coreInfo).map((item, index) => {
                        let itemContent = this.state.coreInfo[item[0]];
                        return (   
                            <section key={index}>
                                {this.renderProfileLabel(item[0])}
                                {this.renderProfileText(itemContent)}
                                <Divider></Divider>
                            </section>
                        )
                    })
                }
                {
                    !this.state.loading &&
                    <Error message={this.state.errorMessage} className={`error-message ${this.state.errorMessage?'show':'hide'}`}></Error>
                }
            </div>
        );
    }
}
Demographics.propTypes = {
    info: PropTypes.object.isRequired
};

