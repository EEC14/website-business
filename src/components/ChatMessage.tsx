import React from 'react';
import { Bot, User, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  isStaff?: boolean;
  isUrgent?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isBot, isStaff, isUrgent }) => {
  return (
    <div
      className={clsx(
        'flex gap-3 p-4 rounded-lg',
        isBot ? 'bg-blue-50' : 'bg-gray-50',
        isUrgent && 'border-l-4 border-red-500'
      )}
    >
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
        isBot ? 'bg-blue-500' : 'bg-gray-700'
      )}>
        {isBot ? (
          <Bot className="w-5 h-5 text-white" />
        ) : (
          <User className="w-5 h-5 text-white" />
        )}
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium">
            {isBot ? 'HealthBot' : isStaff ? 'Medical Staff' : 'Patient'}
          </p>
          {isUrgent && (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Urgent
            </span>
          )}
        </div>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold mt-4 mb-2 text-gray-900">{children}</h2>
              ),
              p: ({ children }) => (
                <p className="mb-2 text-gray-700">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2 text-gray-700">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="mb-1">{children}</li>
              ),
            }}
          >
            {message}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};