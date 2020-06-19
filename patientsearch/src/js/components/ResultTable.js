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

  return (
    <TableContainer component={Paper}>
      <Table className={classes.table} aria-label="result table">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell align="center">Name</TableCell>
            <TableCell align="center">Birth Date</TableCell>
            <TableCell align="center">Gender</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell component="th" scope="row">
                <Button href={row.launchURL} variant="contained" color="primary">Launch</Button>
              </TableCell>
              <TableCell align="center">{row.fullName}</TableCell>
              <TableCell align="center">{row.birthDate}</TableCell>
              <TableCell align="center">{row.gender}</TableCell>
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


