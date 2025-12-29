import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, IconButton, MenuItem, Select, FormControl, InputLabel,
  Alert, Snackbar, Card, CardContent, Grid, Tooltip
} from '@mui/material';
import {
  CheckCircle, Cancel, Visibility, Refresh, Warning,
  Payment, History, Schedule, ErrorOutline
} from '@mui/icons-material';
import api from '../../services/api';

const ManualRenewal = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [failedPayments, setFailedPayments] = useState([]);
  const [expiredSubscriptions, setExpiredSubscriptions] = useState([]);
  const [openVerifyDialog, setOpenVerifyDialog] = useState(false);
  const [openRenewDialog, setOpenRenewDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const subscriptionTypes = [
    { value: 'monthly', label: 'Monthly ($15)' },
    { value: 'quarterly', label: 'Quarterly ($35)' },
    { value: 'yearly', label: 'Yearly ($99)' }
  ];

  const [renewalData, setRenewalData] = useState({
    subscriptionType: 'monthly',
    transactionId: '',
    amount: 15,
    paymentMethod: 'manual',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingRes, failedRes, expiredRes] = await Promise.all([
        api.get('/payments/pending'),
        api.get('/payments/failed'),
        api.get('/payments/subscriptions/expired')
      ]);
      
      setPendingPayments(pendingRes.data.data);
      setFailedPayments(failedRes.data.data);
      setExpiredSubscriptions(expiredRes.data.data);
    } catch (error) {
      showSnackbar('Error fetching data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleVerifyPayment = async () => {
    try {
      await api.put(`/payments/${selectedPayment._id}/verify`, {
        transactionId,
        notes
      });
      
      showSnackbar('Payment verified successfully');
      setOpenVerifyDialog(false);
      fetchData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Verification failed', 'error');
    }
  };

  const handleMarkAsFailed = async (paymentId, reason) => {
    try {
      await api.put(`/payments/${paymentId}/fail`, { reason });
      showSnackbar('Payment marked as failed');
      fetchData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Operation failed', 'error');
    }
  };

  const handleRenewSubscription = async () => {
    try {
      await api.post(`/payments/subscriptions/${selectedUser._id}/renew`, renewalData);
      
      showSnackbar('Subscription renewed successfully');
      setOpenRenewDialog(false);
      fetchData();
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Renewal failed', 'error');
    }
  };

  const handleRenewalChange = (e) => {
    const { name, value } = e.target;
    setRenewalData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'subscriptionType' && {
        amount: value === 'yearly' ? 99 : value === 'quarterly' ? 35 : 15
      })
    }));
  };

  const StatusChip = ({ status }) => {
    const colors = {
      pending: 'warning',
      completed: 'success',
      failed: 'error',
      active: 'success',
      expired: 'error',
      suspended: 'warning'
    };
    
    return <Chip label={status} color={colors[status] || 'default'} size="small" />;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Manual Subscription Management
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pending Verification
                  </Typography>
                  <Typography variant="h3">{pendingPayments.length}</Typography>
                </Box>
                <Payment color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Failed Payments
                  </Typography>
                  <Typography variant="h3">{failedPayments.length}</Typography>
                </Box>
                <ErrorOutline color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Expired Subscriptions
                  </Typography>
                  <Typography variant="h3">{expiredSubscriptions.length}</Typography>
                </Box>
                <Schedule color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Payments Table */}
      <Paper sx={{ mb: 4, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Pending Payment Verification
          </Typography>
          <Button onClick={fetchData} startIcon={<Refresh />}>
            Refresh
          </Button>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Transaction ID</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingPayments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>
                    <Typography>{payment.user?.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {payment.user?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>${payment.amount}</TableCell>
                  <TableCell>
                    <Chip label={payment.subscriptionType} size="small" />
                  </TableCell>
                  <TableCell>
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {payment.transactionId || 'Not provided'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Verify Payment">
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setTransactionId(payment.transactionId || '');
                          setOpenVerifyDialog(true);
                        }}
                      >
                        <CheckCircle />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Mark as Failed">
                      <IconButton
                        color="error"
                        onClick={() => handleMarkAsFailed(payment._id, 'Invalid transaction ID')}
                      >
                        <Cancel />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Expired Subscriptions Table */}
      <Paper sx={{ mb: 4, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Expired Subscriptions Requiring Renewal
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Expired On</TableCell>
                <TableCell>Days Overdue</TableCell>
                <TableCell>Last Payment</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expiredSubscriptions.map((sub) => (
                <TableRow key={sub._id}>
                  <TableCell>
                    <Typography>{sub.user?.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {sub.user?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={sub.plan} color="primary" size="small" />
                  </TableCell>
                  <TableCell>
                    {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {Math.floor((new Date() - new Date(sub.currentPeriodEnd)) / (1000 * 60 * 60 * 24))}
                  </TableCell>
                  <TableCell>
                    ${sub.lastPayment?.amount || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Refresh />}
                      onClick={() => {
                        setSelectedUser(sub.user);
                        setOpenRenewDialog(true);
                      }}
                    >
                      Renew Now
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Failed Payments Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Failed Payments History
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Failed On</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Retry Count</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {failedPayments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>
                    <Typography>{payment.user?.name}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {payment.user?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>${payment.amount}</TableCell>
                  <TableCell>
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={<Warning />}
                      label={payment.failureReason}
                      color="error"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{payment.retryCount}</TableCell>
                  <TableCell>
                    <Tooltip title="Retry Payment">
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setSelectedUser(payment.user);
                          setRenewalData(prev => ({
                            ...prev,
                            transactionId: '',
                            subscriptionType: payment.subscriptionType,
                            amount: payment.amount
                          }));
                          setOpenRenewDialog(true);
                        }}
                      >
                        <History />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Verify Payment Dialog */}
      <Dialog open={openVerifyDialog} onClose={() => setOpenVerifyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Verify Payment</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ pt: 2 }}>
              <Typography gutterBottom>
                User: <strong>{selectedPayment.user?.name}</strong>
              </Typography>
              <Typography gutterBottom>
                Amount: <strong>${selectedPayment.amount}</strong>
              </Typography>
              <Typography gutterBottom>
                Subscription Type: <strong>{selectedPayment.subscriptionType}</strong>
              </Typography>
              
              <TextField
                fullWidth
                label="Transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                margin="normal"
                required
              />
              
              <TextField
                fullWidth
                label="Admin Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                margin="normal"
                multiline
                rows={3}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVerifyDialog(false)}>Cancel</Button>
          <Button
            onClick={handleVerifyPayment}
            variant="contained"
            disabled={!transactionId.trim()}
          >
            Verify & Activate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renew Subscription Dialog */}
      <Dialog open={openRenewDialog} onClose={() => setOpenRenewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Renew Subscription</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
              <Typography gutterBottom>
                User: <strong>{selectedUser.name}</strong>
              </Typography>
              <Typography gutterBottom color="textSecondary">
                {selectedUser.email}
              </Typography>
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Subscription Type</InputLabel>
                <Select
                  name="subscriptionType"
                  value={renewalData.subscriptionType}
                  onChange={handleRenewalChange}
                  label="Subscription Type"
                >
                  {subscriptionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                name="amount"
                label="Amount"
                type="number"
                value={renewalData.amount}
                onChange={handleRenewalChange}
                margin="normal"
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                }}
              />
              
              <TextField
                fullWidth
                name="transactionId"
                label="Transaction ID"
                value={renewalData.transactionId}
                onChange={handleRenewalChange}
                margin="normal"
                required
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  name="paymentMethod"
                  value={renewalData.paymentMethod}
                  onChange={handleRenewalChange}
                  label="Payment Method"
                >
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="stripe">Stripe</MenuItem>
                  <MenuItem value="paypal">PayPal</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                name="notes"
                label="Admin Notes"
                value={renewalData.notes}
                onChange={handleRenewalChange}
                margin="normal"
                multiline
                rows={3}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRenewDialog(false)}>Cancel</Button>
          <Button
            onClick={handleRenewSubscription}
            variant="contained"
            disabled={!renewalData.transactionId.trim()}
          >
            Renew Subscription
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ManualRenewal;