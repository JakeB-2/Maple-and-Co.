// Async server body for the pet edit drawer.

import { requireAuth } from '@/lib/auth/dal'
import { FormBodyNotFound } from '@/components/screens/form-body-not-found'
import { fetchPrimaryPet } from '@/lib/queries/pets'
import { PetForm, type PetFormDefaults } from './pet-form'

type PetFormBodyProps = { mode: 'edit'; id: string }

export async function PetFormBody(props: PetFormBodyProps) {
  const { supabase } = await requireAuth()
  // Single-pet household: the only read is the primary pet — but the URL
  // carries an id, so guard it rather than trusting the param.
  const pet = await fetchPrimaryPet(supabase)

  if (!pet || pet.id !== props.id) {
    return (
      <FormBodyNotFound noun="pet" />
    )
  }

  const defaults: PetFormDefaults = {
    name: pet.name,
    birthday: pet.birthday,
    photo_path: pet.photo_path ?? '',
  }
  return <PetForm mode="edit" id={pet.id} defaultValues={defaults} />
}
