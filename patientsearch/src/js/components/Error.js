import React from 'react';
import renderHTML from 'react-render-html';
import MuiAlert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const useStyles = makeStyles((theme) => ({
  root: {
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
    <div className={classes.root, props.className}>
      <Alert severity="error">
        {props.message && renderHTML(props.message)}
        {!props.message && "Application error occurred."}
      </Alert>
    </div>
  );
}
