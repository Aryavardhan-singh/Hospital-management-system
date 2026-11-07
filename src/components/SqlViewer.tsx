import React, { useState } from 'react'
import schemaSql from '../../schema.sql?raw'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Check, Copy, Terminal, ExternalLink } from 'lucide-react'

export const SqlViewer: React.FC = () => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schemaSql)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy the Supabase setup SQL:', error)
      setCopied(false)
    }
  }

  return (
    <Card className="max-w-4xl mx-auto rounded-[2.5rem] p-4 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-extrabold text-slate-900 dark:text-white">
              schema.sql (Supabase Setup Script)
            </CardTitle>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Copy &amp; run this script in your Supabase SQL Editor
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleCopy}
          className="h-10 px-4 rounded-2xl text-xs font-extrabold border-slate-200 text-slate-700 hover:bg-slate-50 space-x-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-600">Copied SQL!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-slate-400" />
              <span>Copy SQL Script</span>
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
          This setup script drops and recreates the demo tables. Use it only when replacing existing demo data.
          For an existing database, apply <code className="font-mono font-bold">hospital_resources_migration.sql</code> instead.
        </div>
        <div className="mb-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <span>
            Need help? Paste this SQL script into your{' '}
            <a
              href="https://app.supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-extrabold underline inline-flex items-center gap-1"
            >
              Supabase SQL Editor <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        </div>
        <pre className="p-5 rounded-2xl bg-slate-900 text-emerald-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[450px] select-all border border-slate-800 shadow-inner">
          {schemaSql}
        </pre>
      </CardContent>
    </Card>
  )
}
