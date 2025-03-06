import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../SupabaseClient';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface MonacoEditorComponentProps {
  onSubmit: (code: string, language: string, isSubmit: boolean) => void;
  starterCode: string;
  questionId: string;
  onContentChange: (newValue: string) => void;
}

const MonacoEditorComponent: React.FC<MonacoEditorComponentProps> = ({ onSubmit, starterCode, questionId, onContentChange }) => {
  const [value, setValue] = useState<string>(starterCode);
  const [isSubmitDisabled, setIsSubmitDisabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { user, loading: authLoading } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    setValue(starterCode);
  }, [starterCode]);

  useEffect(() => {
    const checkQuestionCompletion = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('completed_questions')
            .select('question_id')
            .eq('user_id', user.id)
            .eq('question_id', questionId)
            .single();
  
          if (error) {
            console.error("Error fetching completed questions:", error);
            setIsSubmitDisabled(false);
            return;
          }
  
          if (!data) {
            setIsSubmitDisabled(false);
          } else {
            setIsSubmitDisabled(true);
          }
  
        } catch (error) {
          console.error("Unexpected error:", error);
          setIsSubmitDisabled(false);
        }
      }
    };

    if (!authLoading && user && questionId) {
      checkQuestionCompletion();
    }
  }, [user, questionId, authLoading]);

  const handleEditorChange = (newValue: string | undefined) => {
    const updatedValue = newValue || '';  
    setValue(updatedValue);
    onContentChange(updatedValue);
  };

  const handleSubmit = async (isSubmit: boolean) => {
    if (!user) {
      alert("You need to be logged in to submit code!");
      return;
    }

    setLoading(true);

    try {
      await onSubmit(value, 'python', isSubmit);
    } catch (error) {
      console.error("Error submitting code:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Language Selector Dropdown */}
      <div className="mb-2 flex justify-between items-center">
        <div className="relative inline-block text-left">
          <div className="inline-flex w-[200px] justify-between gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-left">
            Python
          </div>
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            className="rounded-md bg-indigo-200 dark:bg-indigo-300 px-3.5 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100"
            disabled={loading}
          >
            {loading ? 'Running...' : 'Run'}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitDisabled || loading}
            className={`rounded-md px-3.5 py-2 text-sm font-semibold shadow-sm ${
              isSubmitDisabled || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {loading ? 'Submitting...' : 'Submit Code'}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="python"
          value={value}
          onChange={handleEditorChange}
          options={{
            selectOnLineNumbers: true,
            fontSize: 14,
            lineNumbers: 'on',
            minimap: { enabled: false },
            theme: isDarkMode ? 'vs-dark' : 'vs',
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
};

export default MonacoEditorComponent;
