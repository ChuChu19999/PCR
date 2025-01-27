import React from 'react';
import { Dialog, DialogTitle } from '@mui/material';

const modalTitleStyles = {
  background: 'white',
  color: '#1976d2',
  textAlign: 'center',
  fontSize: '1.5rem',
  fontWeight: 600,
  letterSpacing: '0.3px',
  padding: '12px',
  borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
};

function BaseModal({ open, onClose, title, children, maxWidth = 'sm' }) {
  return (
    <Dialog
      open={open}
      maxWidth={maxWidth}
      fullWidth
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
          borderRadius: '12px',
        },
      }}
    >
      <DialogTitle sx={modalTitleStyles}>{title}</DialogTitle>
      {children}
    </Dialog>
  );
}

export default BaseModal;
