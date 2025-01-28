import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

const ConfirmDialog = ({ open, onClose, onConfirm, title, message }) => {
  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      hideBackdrop={false}
      onClick={e => e.stopPropagation()}
      onClose={(event, reason) => {
        if (reason !== 'backdropClick') {
          onClose();
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          padding: '10px',
          minWidth: '400px',
        },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          color: '#1976d2',
          fontWeight: 700,
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent sx={{ pb: 2 }}>
        <Typography
          variant="body1"
          sx={{
            textAlign: 'center',
            color: '#2c3e50',
          }}
        >
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            minWidth: '120px',
            borderRadius: '8px',
          }}
        >
          Отмена
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          sx={{
            minWidth: '120px',
            borderRadius: '8px',
          }}
        >
          Подтвердить
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
