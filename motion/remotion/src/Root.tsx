import React from 'react';
import {Composition} from 'remotion';
import {KosifBrandIntro} from './KosifBrandIntro';

export const Root: React.FC = () => {
  return (
    <Composition
      id="KosifBrandIntro"
      component={KosifBrandIntro}
      durationInFrames={240}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        title: 'KOSIF',
        subtitle: 'Trusted Audit Intelligence OS',
        eyebrow: 'المراجعة والامتثال الذكي',
      }}
    />
  );
};
