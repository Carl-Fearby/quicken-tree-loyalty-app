'use client';

import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import styles from './styles.module.css';

const paragraphs = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere, quam sed tempus suscipit, metus nibh suscipit nibh, quis commodo eros erat a sem. Curabitur blandit, mi sed efficitur pretium, nunc nulla interdum massa, eget posuere turpis nisl nec neque.',
  'Donec eleifend orci sed feugiat pretium. Sed non lacus sed urna sollicitudin rhoncus. Aliquam erat volutpat. Nam varius porta tortor, vitae lacinia nisl pulvinar eu. Nulla sit amet nisl in erat sollicitudin scelerisque.',
  'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Suspendisse semper eros et libero tincidunt, in tincidunt nunc convallis. Aenean pellentesque tellus eget nulla suscipit, sit amet dignissim purus volutpat.',
  'Praesent non mi non sem elementum mattis. Pellentesque ac velit vel risus feugiat congue. In commodo lacus a urna porttitor, sed pellentesque justo tempor. Mauris vel magna sapien. Etiam ullamcorper quam in dolor pellentesque, sit amet ultrices orci mattis.',
  'Morbi at dapibus quam. Vivamus commodo, eros non posuere pretium, est velit posuere libero, vitae cursus metus lacus vitae purus. Nulla non quam eget erat faucibus laoreet. Phasellus et ligula non elit auctor tristique.',
  'Sed vitae sodales nibh. Cras ut nisi sed arcu aliquet vulputate. Donec sed hendrerit velit. Nulla facilisi. Curabitur tellus quam, lobortis a tellus eu, dignissim scelerisque arcu. Duis finibus tincidunt tortor sit amet facilisis.',
  'Vivamus sollicitudin placerat ipsum, nec aliquam diam ullamcorper at. Pellentesque egestas rhoncus lorem, et sagittis mi eleifend vel. Proin pellentesque mi non est imperdiet, a fermentum enim blandit. Integer in facilisis mi.',
  'Fusce at nulla a lorem sodales varius. In dignissim molestie diam, vitae commodo metus viverra sed. Donec dignissim augue vel nibh tristique, sit amet placerat mi lobortis. Vivamus eu rutrum nibh, non elementum nisi.'
];

export function ScrollTestScreen() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(<article className={styles.root}>
    <p className="eyebrow">Layout test</p>
    <h1>Scroll<br/>surface.</h1>
    <p className={styles.intro}>This intentionally long page tests that content scrolls independently beneath a permanently anchored app navigation.</p>
    {Array.from({length: 4}, (_, group) => <section className={styles.section} key={group}>
      <h2>Section {group + 1}</h2>
      {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </section>)}
  </article>, document.body);
}
