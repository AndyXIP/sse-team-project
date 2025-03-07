interface TestCaseProps {
  input: any;
  expected_output: any;
  actual_output: any;
}

export default function TestCase({ input, expected_output, actual_output}: TestCaseProps) {
  if (!input) return null;

  const formatData = (data: any) => {
    if (typeof data === 'boolean') {
      return data ? 'true' : 'false';
    }
    
    if (typeof data === 'object') {
      return JSON.stringify(data);
    }
    
    return data;
  };  

  const testCaseSections = [
    { title: "Input:", data: input },
    { title: "Expected Output:", data: expected_output },
    { title: "Actual Output:", data: actual_output },
  ];

  return (
    <div>
      {testCaseSections.map(({ title, data }, idx) => (
        <div key={idx} className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800">
          <h2 className="text-md font-bold">{title}</h2>
          <pre className="whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
            {formatData(data)}
          </pre>
        </div>
      ))}
    </div>
  );
}
