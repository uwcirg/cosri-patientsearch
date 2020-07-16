import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import Logout from './Logout';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex'
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    background: theme.palette.primary.base,
    color: theme.palette.secondary.main,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  hide: {
    display: 'none',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(0, 0.5),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(0.5, 2, 1),
  },
  frame: {
    height: "calc(100vh - 96px)",
    border: `1px inset #777`,
    position: "relative",
    marginTop: theme.spacing(1.5),
    background: "#FFF",
    [theme.breakpoints.down('xs')]: {
      marginTop: theme.spacing(5)
    },
  },
  toolbarContent: {
    marginTop: theme.spacing(2),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },
  buttonIcon: {
    marginLeft: theme.spacing(0.75),
    position: "relative",
    top: "2px"
  },
  searchButton: {
    marginRight: theme.spacing(0.5),
    [theme.breakpoints.down('xs')]: {
      marginBottom: theme.spacing(1)
    },
  },
  rightContainer: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap"
  }
}));

export default function PatientViewer(props) {
  const classes = useStyles();
  const getPatientInfo = (info) => {
    if (!info) return "";
    return (<span className="patient-info">
      {
        [
          ["name", info.fullName],
          ["DOB", info.birthDate],
          ["gender", info.gender]
        ].map( (item, index) => {
          return  <span key={`patientinfo_${index}`}><span className="item"><span className="label">{item[0]}</span> {item[1] || "unknown"}</span></span>
        })
      }
    </span>);
  }
  const resetPatientViewer = () => {
    window.location.reload();
  }

  return (
    <div className={classes.root}>
      <AppBar
        position="fixed"
        elevation={0}
        className={classes.appBar}
      >
        <Toolbar variant="dense" className="toolbar">
          <div className={classes.toolbarContent}>
            <div>
              <Typography variant="h6" noWrap>
                Application viewer
              </Typography>
              <Typography variant="body1">
                {props.info && props.info.length? getPatientInfo(props.info[0]): ""}
              </Typography>
            </div>
            <div className={classes.rightContainer}>
              <Button variant="contained" color="primary" onClick={() => {
                  resetPatientViewer();
                }
              } className={classes.searchButton}>
                  New Search
                  <ZoomInIcon className={classes.buttonIcon}></ZoomInIcon>
              </Button>
              <Logout size="medium"></Logout>
            </div>
          </div>
        </Toolbar>
      </AppBar>
      <section className={classes.content}>
        <div className={classes.toolbar} />
        <iframe width="100%" className={classes.frame} name="patientViewer" id="patientViewer" src={props.launchURL}></iframe>
      </section>
    </div>
  );
}
