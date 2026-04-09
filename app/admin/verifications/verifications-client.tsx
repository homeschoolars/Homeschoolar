"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiFetch } from "@/lib/api-client"

type Row = {
  id: string
  name: string
  email: string
  country: string
  certificateUrl: string | null
  createdAt: string
}

export default function GuardianVerificationsClient() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch("/api/admin/verifications")
      const data = (await res.json()) as { users?: Row[]; error?: string }
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setRows(data.users ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const patch = async (userId: string, action: "approve" | "reject") => {
    setBusyId(userId)
    try {
      const res = await apiFetch("/api/admin/verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || "Update failed")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <p className="mt-8 text-sm text-slate-600">Loading…</p>
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-4">
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href="/admin">← Admin home</Link>
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Certificate</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-10">
                  No pending verifications.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{r.country}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-slate-600">
                    {new Date(r.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {r.certificateUrl ? (
                      <Button variant="link" className="h-auto p-0" asChild>
                        <a href={r.certificateUrl} target="_blank" rel="noopener noreferrer">
                          View certificate
                        </a>
                      </Button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      className="bg-[#1D9E75] hover:bg-[#178f6a]"
                      disabled={busyId === r.id}
                      onClick={() => void patch(r.id, "approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === r.id}
                      onClick={() => void patch(r.id, "reject")}
                    >
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
