import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHrStore } from './hrStore'
import { dataService } from '@/services/api/dataService'

// Mock the API dataService
vi.mock('@/services/api/dataService', () => ({
    dataService: {
        getEmployees: vi.fn(),
        addEmployee: vi.fn(),
        getAttendance: vi.fn(),
        markAttendance: vi.fn(),
    }
}))

// Mock dataOrchestrator
vi.mock('@/services/data/dataOrchestrator', () => ({
    dataOrchestrator: {
        fetchCollection: vi.fn().mockResolvedValue([
            { id: 1, name: 'John Doe', position: 'Pharmacist', status: 'active' },
            { id: 2, name: 'Jane Smith', position: 'HR Officer', status: 'active' }
        ])
    }
}))

describe('HR Store - Attendance Module', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('fetches attendance from backend API and updates store', async () => {
        const mockAttendance = [
            { id: 1, employee_id: 1, date: '2026-09-08', status: 'present', check_in_time: '08:30:00' },
            { id: 2, employee_id: 2, date: '2026-09-08', status: 'absent', check_in_time: null }
        ]

        dataService.getAttendance.mockResolvedValue({
            status: 200,
            data: mockAttendance
        })

        const store = useHrStore()
        await store.fetchAttendance()

        expect(dataService.getAttendance).toHaveBeenCalled()
        expect(store.attendance).toHaveLength(2)
        expect(store.attendance[0].status).toBe('present')
        expect(store.attendanceError).toBeNull()
    })

    it('handles backend API fetch errors gracefully', async () => {
        dataService.getAttendance.mockRejectedValue({
            response: { data: { error: 'Failed to fetch attendance from database' } }
        })

        const store = useHrStore()
        const result = await store.fetchAttendance()

        expect(result).toEqual([])
        expect(store.attendance).toEqual([])
        expect(store.attendanceError).toBe('Failed to fetch attendance from database')
        expect(store.attendanceLoading).toBe(false)
    })

    it('marks attendance via backend API and refetches fresh records', async () => {
        const store = useHrStore()

        dataService.markAttendance.mockResolvedValue({
            status: 201,
            data: { message: 'Attendance record saved successfully' }
        })

        dataService.getAttendance.mockResolvedValue({
            status: 200,
            data: [
                { id: 1, employee_id: 1, date: '2026-09-08', status: 'present' }
            ]
        })

        const result = await store.markAttendance({
            employee_id: 1,
            date: '2026-09-08',
            status: 'Present'
        })

        expect(result.success).toBe(true)
        expect(dataService.markAttendance).toHaveBeenCalledWith(expect.objectContaining({
            employee_id: 1,
            date: '2026-09-08',
            status: 'present'
        }))
        // Ensure fetchAttendance was triggered to refresh state from backend
        expect(dataService.getAttendance).toHaveBeenCalled()
        expect(store.attendance).toHaveLength(1)
        expect(store.attendanceError).toBeNull()
    })

    it('handles mark attendance API errors and sets error message', async () => {
        const store = useHrStore()

        dataService.markAttendance.mockRejectedValue({
            response: { data: { error: 'Database constraint violation' } }
        })

        const result = await store.markAttendance({
            employee_id: 999,
            date: '2026-09-08',
            status: 'present'
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Database constraint violation')
        expect(store.attendanceError).toBe('Database constraint violation')
    })

    it('retrieves employee attendance record for a specific date', async () => {
        const store = useHrStore()
        store.attendance = [
            { id: 10, employee_id: 1, date: '2026-09-08', status: 'present' },
            { id: 11, employee_id: 2, date: '2026-09-08', status: 'absent' },
            { id: 12, employee_id: 1, date: '2026-09-07', status: 'absent' }
        ]

        const todayRecord = store.getEmployeeAttendanceRecord(1, '2026-09-08')
        expect(todayRecord).not.toBeNull()
        expect(todayRecord?.status).toBe('present')

        const yesterdayRecord = store.getEmployeeAttendanceRecord(1, '2026-09-07')
        expect(yesterdayRecord?.status).toBe('absent')

        const nonExistent = store.getEmployeeAttendanceRecord(1, '2026-09-01')
        expect(nonExistent).toBeNull()
    })
})
