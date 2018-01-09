import React, { Component } from 'react'
import {CheckIfRegistered, checkForGdeployAnsFiles} from '../helpers/HostedEngineSetup'
import HeSetupWizardContainer from './HostedEngineSetup/HeSetupWizard/HeSetupWizardContainer'
import GdeploySetup from './gdeploy/GdeploySetup'
import GdeployUtil from '../helpers/GdeployUtil'
import { heSetupState, deploymentOption, deploymentTypes } from './HostedEngineSetup/constants'
import { CONFIG_FILES as constants } from '../components/gdeploy/constants'
import Selectbox from './common/Selectbox'

const classNames = require('classnames');

class HostedEngineSetup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      cancelled: false,
      deploymentOption: deploymentOption.REGULAR,
      deploymentType: deploymentTypes.ANSIBLE_DEPLOYMENT,
      state: heSetupState.POLLING,
      gdeployAvailable: false,
      gdeployFilesFound: false,
      registered: false,
      registeredTo: "",
      answerFiles: []
    };
    this.registeredCallback = this.registeredCallback.bind(this);
    this.gdeployFileCallback = this.gdeployFileCallback.bind(this);
    this.onClick = this.onClick.bind(this);
    this.abortCallback = this.abortCallback.bind(this);
    this.startSetup = this.startSetup.bind(this);
    this.startGdeploy = this.startGdeploy.bind(this);
    this.handleOptionChange = this.handleOptionChange.bind(this);
    this.redeploy = this.redeploy.bind(this);
    this.deploymentTypeChange = this.deploymentTypeChange.bind(this);

    CheckIfRegistered(this.registeredCallback);
  }

  componentWillMount() {
      checkForGdeployAnsFiles(this.gdeployFileCallback);
  }

  componentDidMount() {
    const that = this;
    GdeployUtil.isGdeployAvailable(function (isAvailable) {
      that.setState({ gdeployAvailable: isAvailable })
    })
  }

  onClick() {
    this.setState({ cancelled: false });

    if (this.state.deploymentOption === deploymentOption.REGULAR) {
      this.startSetup();
    } else if (this.state.deploymentOption === deploymentOption.HYPERCONVERGED) {
      this.startGdeploy();
    } else if (this.state.deploymentOption === 'useExistingConfig') {
        this.startSetup([ constants.heAnsfileFile, constants.heCommonAnsFile ]);
    }
  }

  registeredCallback(isRegistered, engine) {
    if (isRegistered) {
      this.setState({state: heSetupState.REGISTERED,
                     registeredTo: engine})
    } else {
      this.setState({state: heSetupState.EMPTY})
    }
  }

  gdeployFileCallback(filesExist) {
      if (filesExist) {
          this.setState({ gdeployFilesFound: true });
      }
  }

  redeploy() {
    this.setState({state: heSetupState.EMPTY})
  }

  startSetup(answerFiles) {
    this.setState({ state: heSetupState.HOSTED_ENGINE, answerFiles: answerFiles });
  }

  startGdeploy() {
    this.setState({ state: heSetupState.GDEPLOY })
  }

  abortCallback() {
    this.setState({ cancelled: true })
    this.setState({ state: heSetupState.EMPTY })
  }

  handleOptionChange(changeEvent) {
    this.setState({
      deploymentOption: changeEvent.target.value
    });
  }

  deploymentTypeChange(type) {
    this.setState({ deploymentType: type });
  }

  render() {
    return (
      <div>
        { this.state.state === heSetupState.POLLING &&
          <div className="spinner" />
        }
        { this.state.state === heSetupState.REGISTERED &&
          <Registered
            callback={this.redeploy}
            engine={this.state.registeredTo}
          />
        }
        { this.state.state === heSetupState.EMPTY &&
          <Curtains
            callback={this.onClick}
            cancelled={this.state.cancelled}
            deploymentOption={this.state.deploymentOption}
            deploymentType={this.state.deploymentType}
            deploymentTypeChangeCallback={this.deploymentTypeChange}
            gdeployAvailable={this.state.gdeployAvailable}
            gdeployFilesFound={this.state.gdeployFilesFound}
            selectionChangeCallback={this.handleOptionChange}
            />
        }
        {this.state.state === heSetupState.HOSTED_ENGINE &&
          <HeSetupWizardContainer
              deploymentType={this.state.deploymentType}
              gDeployAnswerFilePaths={this.state.answerFiles}
              onSuccess={this.startSetup}
              onClose={this.abortCallback}
          />
        }
        { this.state.state === heSetupState.GDEPLOY &&
          <GdeploySetup onSuccess={this.startSetup} onClose={this.abortCallback} />
        }
      </div>
    )
  }
}

const Curtains = ({callback, cancelled, deploymentOption, deploymentType, deploymentTypeChangeCallback,
                      gdeployAvailable, gdeployFilesFound, selectionChangeCallback}) => {
  let message = cancelled ?
    "Hosted engine setup was aborted" :
    "Configure and install a highly-available virtual machine which will \
    run oVirt Engine to manage multiple compute nodes, or add this system \
    to an existing hosted engine cluster."
  let button_text = cancelled ?
    "Restart" : "Start"
  const gdeployClass = classNames({
    radio: true,
    "disabled": !gdeployAvailable
  })
  const gdeployTitle = gdeployAvailable ?
    "Gluster volume will be provisioned using gdeploy and hosted engine will be deployed on gluster" :
    "Gdeploy utility is not installed. Install gdeploy to enable gluster deployment";
  const deploymentTypeOptions = [
      { key: deploymentTypes.ANSIBLE_DEPLOYMENT, title: "Ansible-based Deployment (Recommended)" },
      { key: deploymentTypes.OTOPI_DEPLOYMENT, title: "Vintage (OTOPI-based) Deployment" }
  ];
  return (
    <div className="curtains curtains-ct blank-slate-pf">
      <div className="container-center">
        <div className="blank-slate-pf-icon">
          <i className="pficon-cluster" />
        </div>
        <h1>
          Hosted Engine Setup
        </h1>
        <p className="curtains-message">
          {message}
        </p>
        <form>
          <div className="radio">
            <label>
              <input type="radio" value="regular"
                checked={deploymentOption === "regular"}
                onChange={selectionChangeCallback} />
              Standard
              </label>
          </div>
          {gdeployFilesFound &&
          <div className="radio">
            <label>
              <input type="radio" value="useExistingConfig"
                     checked={deploymentOption === 'useExistingConfig'}
                     onChange={selectionChangeCallback} />
              Hosted Engine using existing Gluster configuration
            </label>
          </div>
          }
          <div className={gdeployClass}  data-placement="top" title={gdeployTitle}>
            <label>
              <input type="radio" value="hci" disabled={!gdeployAvailable}
                checked={deploymentOption === "hci"}
                onChange={selectionChangeCallback} />
              Hosted Engine with Gluster
              </label>
          </div>
        </form>
        <div className="blank-slate-pf-main-action">
          <button
            className="btn btn-lg btn-primary"
            onClick={callback}>{button_text}</button>
        </div>
          <div className="deployment-type-dropbox horizontal-center">
            <Selectbox optionList={deploymentTypeOptions}
                       selectedOption={deploymentType}
                       callBack={(e) => deploymentTypeChangeCallback(e)}/>
          </div>
      </div>
    </div>
  )
};

const Registered = ({callback, engine}) => {
  let message = `This system is already registered to ${engine}!`
  let button_text = "Redeploy"
  return (
    <div className="curtains curtains-ct blank-slate-pf">
      <div className="container-center">
        <div className="blank-slate-pf-icon">
          <i className="pficon-cluster" />
        </div>
        <h1>
          Hosted Engine Setup
        </h1>
        <p className="curtains-message">
          {message}
        </p>
        <div className="blank-slate-pf-main-action">
          <button
            className="btn btn-lg btn-primary"
            onClick={callback}>{button_text}</button>
        </div>
      </div>
    </div>
  )
};

export default HostedEngineSetup
