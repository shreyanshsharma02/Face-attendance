import { apiFetch, recognitionFetch } from './client'

export interface Employee {
  id: number
  employeeCode: string
  fullName: string
  active: boolean
  faceEnrolled: boolean
}

export interface CreateEmployeePayload {
  employeeCode: string
  fullName: string
}

export interface EnrollPayload {
  employee_id: string
  image_b64: string
}

export interface EnrollResponse {
  employee_id: string
  embedding: number[]
}

export function listEmployees(): Promise<Employee[]> {
  return apiFetch('/api/employees')
}

export function createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
  return apiFetch('/api/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function setEmployeeActive(id: number, active: boolean): Promise<Employee> {
  return apiFetch(`/api/employees/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  })
}

export function enrollFace(payload: EnrollPayload): Promise<EnrollResponse> {
  return recognitionFetch('/enroll', payload)
}

export function saveEmbedding(employeeId: number, embedding: number[]): Promise<void> {
  return apiFetch(`/api/employees/${employeeId}/embedding`, {
    method: 'PUT',
    body: JSON.stringify({ embedding }),
  })
}
