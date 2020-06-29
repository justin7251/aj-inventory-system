export interface Roles { 
	staff?: boolean;
	manager?: boolean;
	admin?: boolean;
}


export class FirebaseUserModel {
  name: string;
  provider: string;
  uid: string;
  roles: Roles;

  constructor(){
    this.name = "";
    this.provider = "";
    this.uid = "";
  }
}
