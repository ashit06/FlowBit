'use client'

import { useState } from 'react'
import { Send, Database, Code } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sql?: string
  data?: any[]
}

export default function ChatWithData() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat-with-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input })
      })

      const result = await response.json()
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.answer || 'I found some results for your query.',
        sql: result.sql,
        data: result.data
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request.'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Chat with Data</h1>
            <p className="text-sm text-gray-500 mt-1">Ask natural language questions about your invoice data</p>
          </div>
        </div>
      </div>

      <div className="p-6 h-full flex flex-col">
        {/* Chat Messages */}
        <div className="bg-white rounded-lg border border-gray-200 flex-1 mb-4 flex flex-col">
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Database className="w-12 h-12 text-gray-400 mb-4" />
                <div className="text-gray-500 mb-2">Start a conversation with your data</div>
                <div className="text-sm text-gray-400">
                  Try asking: "What's the total spend this year?" or "Show me the top 5 vendors"
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
                    <div className={`p-4 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                    
                    {message.sql && (
                      <div className="mt-3 p-4 bg-gray-900 text-gray-100 rounded-lg text-sm">
                        <div className="flex items-center mb-2">
                          <Code className="w-4 h-4 mr-2" />
                          <span className="font-medium">Generated SQL:</span>
                        </div>
                        <pre className="whitespace-pre-wrap font-mono text-xs">{message.sql}</pre>
                      </div>
                    )}
                    
                    {message.data && message.data.length > 0 && (
                      <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center mb-3">
                          <Database className="w-4 h-4 mr-2" />
                          <span className="font-medium text-gray-900">Results ({message.data.length} rows):</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                {Object.keys(message.data[0]).map(key => (
                                  <th key={key} className="text-left py-2 px-3 font-medium text-gray-900">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {message.data.slice(0, 10).map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-gray-100">
                                  {Object.values(row).map((value: any, cellIndex) => (
                                    <td key={cellIndex} className="py-2 px-3 text-gray-700">
                                      {typeof value === 'number' && value % 1 !== 0 
                                        ? value.toFixed(2)
                                        : String(value)
                                      }
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {message.data.length > 10 && (
                            <div className="text-xs text-gray-500 mt-2 text-center">
                              Showing first 10 of {message.data.length} results
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-3xl mr-12">
                  <div className="bg-gray-100 text-gray-900 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input Form */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
            <div className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your invoice data..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}