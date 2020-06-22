import React from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

const useStyles = makeStyles({
    table: {
        minWidth: 450,
        maxWidth: "100%"
    },
});

export default function ResultTable(props) {
  const classes = useStyles();
  const rows = props.rows || [];
  const header = ['','Name', 'Birth Date', 'Gender'].map(item => {
    return  <TableCell>{item}</TableCell>
  });

  return (
    <TableContainer component={Paper}>
      <Table className={classes.table} aria-label="result table">
        <TableHead>
          <TableRow>
            {header}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${row.name}_${index}`}>
              <TableCell component="th" scope="row">
                <Button href={row.launchURL} variant="contained" color="primary">Launch</Button>
              </TableCell>
              {['fullName', 'birthDate', 'gender'].map(item => {
                return (<TableCell align="center">{row[item]}</TableCell>)
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
ResultTable.propTypes = {
  rows: PropTypes.array.isRequired
};
