import { Controller, Post, Get, Patch, Body, Query, Param } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // Llamado justo después del login en Firebase para registrar o recuperar el usuario
  @Post('login')
  async loginUsuario(
    @Body('tenantId') tenantId: string,
    @Body('email') email: string,
    @Body('displayName') displayName: string,
    @Body('photoURL') photoURL: string,
  ) {
    return this.usuariosService.registerOrGetUser(tenantId, email, displayName, photoURL);
  }

  // Listar todos los usuarios (para la pantalla de Admin)
  @Get()
  async getUsuarios(@Query('tenantId') tenantId: string) {
    return this.usuariosService.getUsuarios(tenantId);
  }

  // Actualizar el rol de un usuario (solo el Admin puede hacer esto)
  @Patch(':email/rol')
  async updateRol(
    @Param('email') email: string,
    @Query('tenantId') tenantId: string,
    @Body('rol') rol: string,
  ) {
    return this.usuariosService.updateRol(tenantId, email, rol);
  }
}
