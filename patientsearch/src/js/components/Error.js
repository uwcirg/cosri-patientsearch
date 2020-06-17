import React from 'react';
import PropTypes from 'prop-types';
import renderHTML from 'react-render-html';
import MuiAlert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(2),
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2)
    },
  },
}));

export default function ErrorMessage(props) {
  const classes = useStyles();
  return (
    <div className={classes.root} style={props.style}>
      <Alert severity="error">
        {props.message && renderHTML(props.message)}
      </Alert>
    </div>
  );
}

ErrorMessage.propTypes = {
  message: PropTypes.string.isRequired
};
