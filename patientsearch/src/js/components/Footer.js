import React, { Component } from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Link from '@material-ui/core/Link';

export default class Footer extends Component {
  render() {
      return (
        <Container maxWidth="lg" id="footerContainer">
            <Grid container spacing={3}>
                <Grid item xs={12} md={12} lg={12}>
                    <Box pt={4}>
                        <Typography variant="body2" color="textSecondary" align="center">
                            © Created by &nbsp;
                            <Link color="inherit" href="https://cirg.washington.edu/" target="_blank" rel="noreferrer" className="cta">
                                Clinical Informatics Research Group
                            </Link>
                            &nbsp;
                            {' '}
                            {new Date().getFullYear()}
                            {'.'}
                            &nbsp; All rights reserved.
                        </Typography>
                    </Box>
                </Grid>
            </Grid>
        </Container>
      );
  }
}
