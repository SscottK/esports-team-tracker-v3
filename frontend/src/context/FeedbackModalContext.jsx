import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import BetaFeedbackModal from '../components/BetaFeedbackModal';

const FeedbackModalContext = createContext(null);

export function FeedbackModalProvider({ children }) {
  const [show, setShow] = useState(false);

  const openFeedback = useCallback(() => setShow(true), []);
  const closeFeedback = useCallback(() => setShow(false), []);

  const value = useMemo(
    () => ({ openFeedback, closeFeedback }),
    [openFeedback, closeFeedback],
  );

  return (
    <FeedbackModalContext.Provider value={value}>
      {children}
      <BetaFeedbackModal show={show} onHide={closeFeedback} />
    </FeedbackModalContext.Provider>
  );
}

export function useFeedbackModal() {
  const context = useContext(FeedbackModalContext);
  if (!context) {
    throw new Error('useFeedbackModal must be used within FeedbackModalProvider');
  }
  return context;
}
