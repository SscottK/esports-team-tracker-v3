import { useNavigate } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

export default function BackButton({
  fallback = '/dashboard',
  label = 'Back',
  variant = 'outline-primary',
  size = 'sm',
  ...props
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  };

  return (
    <Button variant={variant} size={size} onClick={handleBack} {...props}>
      {label}
    </Button>
  );
}
