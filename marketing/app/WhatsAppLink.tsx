import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowRight, faArrowUp } from '@fortawesome/free-solid-svg-icons';

export const whatsappUrl = 'https://wa.me/447940147138?text=Hi%20Pace%2C%20I%27d%20like%20to%20talk%20about%20the%20platform.';

export function WhatsAppArrow() {
  return <FontAwesomeIcon icon={faArrowRight} className="arrow-diagonal" aria-hidden="true"/>;
}

export function ArrowIcon({direction = 'up-right'}: {direction?: 'up-right' | 'down' | 'right' | 'up'}) {
  const icons = { 'up-right': faArrowRight, down: faArrowDown, right: faArrowRight, up: faArrowUp };
  return <FontAwesomeIcon icon={icons[direction]} className={direction === 'up-right' ? 'arrow-diagonal' : undefined} aria-hidden="true"/>;
}
