import React from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';

export default function DeletePortfolioModal({ selectedPortfolioName, currPortfolioId, modalProps }) {
  const { show, setShow } = modalProps;
  const handleClose = () => setShow(false);

  const handleDeletePortfolio = () => {
    axios.delete(`/portfolios/${currPortfolioId}/delete`)
      .then((result) => {
        console.log(result);
        // reload all the portfolios
        // display first portfolio view
        setShow(false);
      })
      .catch((err) => console.log(err));
  };

  return (
    <div>
      <Modal show={show} onHide={handleClose} backdrop="static">
        <Modal.Header closeButton>
          <div className="d-flex justify-content-center">
            <Modal.Title>
              Delete
              {' '}
              {selectedPortfolioName}
              {' '}
              Portfolio?
            </Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            Are you sure you want to delete this portfolio?
          </div>
          <div className="text-center">
            Your trades will not be saved.
          </div>
          <br />
          <div className="d-flex justify-content-center">
            <div className="mr-3">
              <Button type="submit" variant="danger" onClick={handleDeletePortfolio}> Yes </Button>
            </div>
            <div>
              <Button type="submit" variant="outline-info" onClick={handleClose}>Cancel</Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
