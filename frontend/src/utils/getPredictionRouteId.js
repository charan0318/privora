export const getPredictionRouteId = (prediction) => {
  if (!prediction) return null;

  const routeId = prediction.contractId || prediction.id || prediction._id;
  return routeId != null ? String(routeId) : null;
};
