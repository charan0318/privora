import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PredictionDetail_Component from '../modules/prediction/PredictionDetail';
import { ArrowLeft } from 'lucide-react';

const PredictionDetailView = () => {
  const { predictionId } = useParams();
  const navigate = useNavigate();

  if (!predictionId) {
    navigate('/');
    return null;
  }

  return (
    <div className="site-background min-h-screen">
      <div className="max-w-6xl mx-auto p-8 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 text-[#71717A] hover:text-[#ECEDEE] font-mono text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Markets
        </button>

        <PredictionDetail_Component predictionId={predictionId} />
      </div>
    </div>
  );
};

export default PredictionDetailView;


