import { Injectable } from '@angular/core';
import { Firestore, doc, updateDoc, serverTimestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreGenericService {
  constructor(public firestore: Firestore) {}

  softDeleteDocument(collectionPath: string, documentId: string) {
    const docRef = doc(this.firestore, collectionPath, documentId);
    return updateDoc(docRef, {
      deleted: true,
      deleted_date: serverTimestamp()
    });
  }
}
