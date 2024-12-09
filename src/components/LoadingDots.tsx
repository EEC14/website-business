import React from 'react';

export const LoadingDots: React.FC = () => {
  return (
    <div className="flex space-x-1 items-center justify-center">
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
    </div>
  );
};