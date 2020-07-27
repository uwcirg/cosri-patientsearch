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
  const LAUNCH_FIELD_KEY = "Launch_URL";
  const header = (Object.keys(rows[0])).map((item, index) => {
    return  <TableCell key={`headercell_${index}`}>{item == LAUNCH_FIELD_KEY ? "" : item.replace(/\_/g, " ")}</TableCell>
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
            <TableRow key={`row_${index}`}>
              {Object.entries(row).map((item, index) => {
                if (item[0] == LAUNCH_FIELD_KEY) return (<TableCell key={`cell_launch_${index}`}>
                  <Button onClick={() => props.callback(row[LAUNCH_FIELD_KEY])} variant="contained" color="primary">Launch</Button>
                </TableCell>)
                else return (<TableCell key={`cell_${item[0]}_${index}`} align="center">{item[1]}</TableCell>)
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
