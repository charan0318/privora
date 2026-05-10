import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PredictionDetail_Component from '../modules/prediction/PredictionDetail';

const PredictionDetail = () => {
  const { predictionId } = useParams();
  const navigate = useNavigate();

  if (!predictionId) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 text-gray-400 hover:text-gray-200 font-medium"
        >
          ← Back to Predictions
        </button>

        <PredictionDetail_Component predictionId={predictionId} />
      </div>
    </div>
  );
};

export default PredictionDetail;


