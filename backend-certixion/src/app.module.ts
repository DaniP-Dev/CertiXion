import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DriveModule } from './drive/drive.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ClientesModule } from './clientes/clientes.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { DatosCampoModule } from './datos-campo/datos-campo.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    AuthModule, 
    DriveModule,
    ClientesModule,
    OrdenesModule,
    DatosCampoModule,
    UsuariosModule,
  ],
})
export class AppModule {}
