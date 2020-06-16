import React, {Component} from "react";
import PropTypes from 'prop-types';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import InputLabel from '@material-ui/core/InputLabel';
import Error from './Error';
import {sendRequest} from './Utility';

export default class Questionnaire extends Component {
    constructor () {
        super(...arguments);
        this.state = {
            questions: [],
            answers: [],
            loading: true,
            errorMessage: ""
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
        let queryParamsObj =  [{"based-on": this.props.carePlanId},{"_include":"QuestionnaireResponse:questionnaire"}];
        let getQueryParams = (params) => {
          if (!params) return "";
          return (params.map((item) => {
            return Object.entries(item)[0].join("=");
          })).join("&");
        };
        sendRequest(`./QuestionnaireResponse?${getQueryParams(queryParamsObj)}`).then(response => {
          let rawData = {};
          if (response) {
            try {
              rawData = JSON.parse(response);
            } catch(e) {
              console.log("error parsing response! ", e);
              this.setCurrentState({loading: false, errorMessage: `Error retrieving questionnaire data: ${e} <a href="/">Refresh</a>`});
              return;
            }
            
          }
          if (!rawData || !rawData.entry || !rawData.entry.length) {
            this.setCurrentState({loading: false});
            return false;
          }
          let dataSet = {"questions": [], "answers": []};

          rawData.entry.forEach(function(entry) {
              let resource = entry.resource;
              if (!resource) {
                return true;
              }
              if (resource.resourceType == "QuestionnaireResponse") {
                if (resource.item && resource.item.length) {
                  resource.item.forEach(function(subitem) {
                    dataSet["answers"].push({
                      linkId: subitem.linkId,
                      answer: subitem.answer && subitem.answer.length && subitem.answer[0] && subitem.answer[0].valueCoding?subitem.answer[0].valueCoding.display: ""
                    });
                  });
                }
              }
              if (resource.resourceType == "Questionnaire" && resource.status == "active") {
                let qItem = {title: resource.title, items: []};
                resource.item.forEach(function(subitem) {
                  qItem.items.push({
                    linkId: subitem.linkId,
                    text: subitem.text
                  })
                });
                dataSet["questions"].push(qItem);
              }
          });
          this.setCurrentState({questions: dataSet["questions"], answers: dataSet["answers"],loading: false, errorMessage: ""});
        }, error => {
          let errorMessage = error.statusText ? error.statusText: error;
          console.log("Failed ", errorMessage);
          //unauthorized error
          if (error.status && error.status == 401) {
            console.log("Failed: Unauthorized ", errorMessage);
            window.location = "/";
            return;
          }
          this.setCurrentState({loading: false, errorMessage: errorMessage});
        });
    }
    render() {
        let getAnswerItems = (items) => {
          let answerItems = [];
          (items).forEach((item, key) => {
            let linkId = item.linkId;
            let arrAnswer = this.state.answers.filter(subitem => subitem.linkId == linkId);
            if (arrAnswer.length) {
              answerItems.push(<p className="content" key={key}><span className="question-text muted-text">{`${item.text}:`}</span><span>{arrAnswer[0].answer || '--'}</span></p>);
            }
          });
          return answerItems;
        };
        let items =  (this.state.questions).map((item, key) => {
          return (
            <ExpansionPanel key={key} className="questionnaire-panel">
               <ExpansionPanelSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel${key}-content`}
                id={`panel${key}-header`}
              >
              {item.title}
              </ExpansionPanelSummary>
              <ExpansionPanelDetails className="questionnaire-detail-summary">
                {
                  getAnswerItems(item.items)
                }
              </ExpansionPanelDetails>
            </ExpansionPanel>
          )
        });
  
        return (
            <div className="questionnaire-details-container">
              <Error message={this.state.errorMessage} className={`error-message ${this.state.errorMessage?'show':'hide'}`}></Error>
              <div className={this.state.loading?"loading":"hide"}>
                <div className="loader"></div>
              </div>
              <div className={this.state.loading?"hide":"show"}>
                <InputLabel required={false} shrink={true} className="profile-label">Questionnaire list</InputLabel>
                <div className="questionnaire-list">
                {items}
                </div>
                {!this.state.loading && !items.length && !this.state.errorMessage && <div>No data available</div>}
              </div>
            </div>
        );
    }
}
Questionnaire.propTypes = {
  carePlanId: PropTypes.string.isRequired
};
