'use client'

import React, { useState, useEffect } from 'react';
import MonacoEditorComponent from '../../components/MonacoEditor';
import { ChevronDownIcon } from '@heroicons/react/16/solid';

const EditorPage = () => {
  // State to store output, error messages, and test case inputs
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<string>('');
  const [apiTestCases, setApiTestCases] = useState<string[]>([]); // State to store fetched test cases
  const [activeTab, setActiveTab] = useState<'console' | 'testCases'>('testCases'); // Default to 'testCases'

  // Fetch test cases from the backend API on component mount
  useEffect(() => {
    const fetchTestCases = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/get-test-cases');
        if (!response.ok) {
          throw new Error('Failed to fetch test cases');
        }
        const data = await response.json();
        setApiTestCases(data.testCases || []); // Assuming the backend returns an object with a 'testCases' array
      } catch (error) {
        console.error('Error fetching test cases:', error);
        setError('An error occurred while fetching test cases');
      }
    };

    fetchTestCases();
  }, []); // Empty dependency array means it will run once when the component mounts

  const handleCodeSubmission = async (code: string, language: string) => {
    try {
      const response = await fetch('http://127.0.0.1:5000/api/submit-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, language }), // Sending both code and language
      });

      if (!response.ok) {
        throw new Error('Failed to submit code');
      }

      const result = await response.json();

      // Handle the successful submission and update output or error
      if (result.output) {
        setOutput(result.output);
        setError(null);  // Clear previous errors
      } else if (result.error) {
        setError(result.error);
        setOutput(null);  // Clear previous output
      }
    } catch (error) {
      console.error(error);
      setError("An error occurred while submitting the code."); // Display the error in the box
      setOutput(null);  // Clear output in case of an error
    }
  };

  const handleTestCaseInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTestCases(event.target.value); // Update test case inputs
  };

  const tabs = [
    { name: 'Console', value: 'console', current: activeTab === 'console' },
    { name: 'Test Cases', value: 'testCases', current: activeTab === 'testCases' },
  ];

  const classNames = (...classes: string[]) => classes.filter(Boolean).join(' ');

  return (
    <div className="ml-4 mr-4">
      <h1>Medium Question - question</h1>

      {/* Monaco Editor with Language Selector */}
      <MonacoEditorComponent onSubmit={handleCodeSubmission} />

      {/* Tab Navigation */}
      <div className="hidden sm:block mt-4 mx-auto max-w-4xl"> {/* Centering and limiting width */}
        <nav aria-label="Tabs" className="isolate flex divide-x divide-gray-200 rounded-lg shadow">
          {tabs.map((tab, tabIdx) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.value as 'console' | 'testCases')}
              aria-current={tab.current ? 'page' : undefined}
              className={classNames(
                tab.current ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700',
                tabIdx === 0 ? 'rounded-l-lg' : '',
                tabIdx === tabs.length - 1 ? 'rounded-r-lg' : '',
                'group relative min-w-0 flex-1 overflow-hidden bg-white px-4 py-4 text-center text-sm font-medium hover:bg-gray-50 focus:z-10',
              )}
            >
              <span>{tab.name}</span>
              <span
                aria-hidden="true"
                className={classNames(
                  tab.current ? 'bg-indigo-500' : 'bg-transparent',
                  'absolute inset-x-0 bottom-0 h-0.5',
                )}
              />
            </button>
          ))}
        </nav>
      </div>

      {/* Display Tab Content */}
      {activeTab === 'testCases' && (
        <div className="mt-4 space-y-4">
          <div className="flex space-x-4">
            {/* Dynamically display the fetched test cases */}
            {apiTestCases.length > 0 ? (
              apiTestCases.map((testCase, index) => (
                <button
                  key={index}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                  onClick={() => setTestCases(testCase)}
                >
                  Case {index + 1}
                </button>
              ))
            ) : (
              <p>No test cases available</p>
            )}
          </div>

          {/* Display Test Case Input */}
          <div className="mt-4">
            {/* Optional: Display entered test cases */}
            {testCases && (
              <div className="mt-2 p-4 bg-gray-100 rounded-md">
                <strong>Entered Test Cases:</strong>
                <p>{testCases}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'console' && (
        <div
          style={{
            marginTop: '20px',
            marginBottom: '20px',
            padding: '15px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            backgroundColor: '#f9f9f9',
            minHeight: '100px',
            whiteSpace: 'pre-wrap', // Preserve newlines
          }}
        >
          {/* Render output or error */}
          {output ? (
            <pre>{output}</pre>
          ) : error ? (
            <pre style={{ color: 'red' }}>{error}</pre>
          ) : (
            <p>No output yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default EditorPage;
