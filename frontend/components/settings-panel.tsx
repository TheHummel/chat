'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Settings2, Zap } from 'lucide-react'

import { SmartModelSelector } from './smart-model-selector'
import { SpendTracker } from './spend-tracker'

export function SettingsPanel() {
  const [open, setOpen] = useState(true)
  
  const [selectedModel, setSelectedModel] = useState("gpt-4o");

  return (
    <div className='shadow-[0_-25px_20px_-25px_rgba(0,0,0,0.1)]'>
      <div
        className="flex cursor-pointer items-center gap-2 border-t p-4 hover:bg-gray-100"
        onClick={() => setOpen(!open)}
      >
        <Settings2 className="h-4 w-4" />
        <span className="text-basefont-medium">Settings</span>
        {/* up and down arrow on the right based on whether is opened or not */}
        <span className="ml-auto">
          {!open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </div>
      {open && (
        <div className="border-muted space-y-4 border-t px-4 pb-4">
          <div>

            {/* model selection */}
            <div className="space-y-2">
              <label className="text-sm font-bold">AI Model</label>
                <SmartModelSelector
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                />
            </div>
                {/* credits display */}
                <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">Available Credits</span>
                </div>
                <SpendTracker />
                </div>
          </div>
        </div>
      )}

      
    </div>
  )
}
