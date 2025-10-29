const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { EmailService } = require('../services');

class AuthController {
  // Registro de usuario - ACTUALIZADO PARA ORACLE
  async register(req, res) {
    try {
      const { name, email, password, role = 'cliente', phone } = req.body;

      // Validaciones
      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, email y contraseña son requeridos'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      // Verificar si el usuario ya existe - ACTUALIZADO
      const existingUser = await User.findOne({ 
        where: { 
          email: email.toLowerCase().trim() // Oracle es case-sensitive
        } 
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 12);

      // Crear usuario - ACTUALIZADO PARA UUID DE ORACLE
      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role.toLowerCase(),
        phone: phone ? phone.trim() : null
      });

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' } // Aumentado a 24h
      );

      // Enviar email de bienvenida
      try {
        await EmailService.sendWelcomeEmail(user.email, user.name);
      } catch (emailError) {
        console.error('Error enviando email de bienvenida:', emailError);
        // No fallar el registro si el email falla
      }

      // Excluir password de la respuesta - ACTUALIZADO NOMBRES DE CAMPOS
      const userResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at, // Usar nombres de Oracle
        updated_at: user.updated_at
      };

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: userResponse,
          token
        }
      });

    } catch (error) {
      console.error('Error en registro:', error);
      
      // Manejar errores específicos de Oracle
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Login de usuario - ACTUALIZADO
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validaciones
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      // Buscar usuario - ACTUALIZADO PARA CASE-SENSITIVE
      const user = await User.findOne({ 
        where: { 
          email: email.toLowerCase().trim() 
        } 
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales incorrectas'
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales incorrectas'
        });
      }

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Excluir password de la respuesta - ACTUALIZADO
      const userResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: userResponse,
          token
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Obtener perfil del usuario actual - ACTUALIZADO
  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.userId, {
        attributes: { 
          exclude: ['password'] 
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Formatear respuesta para Oracle
      const userResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        created_at: user.created_at,
        updated_at: user.updated_at
      };

      res.json({
        success: true,
        data: { user: userResponse }
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error del sistema'
      });
    }
  }

  // Middleware de autenticación (sin cambios)
  async authenticateToken(req, res, next) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token de acceso requerido'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      req.userEmail = decoded.email; // Añadido para usar en otros controladores
      next();

    } catch (error) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  }

  // Middleware de autorización por rol (sin cambios)
  authorize(roles = []) {
    return (req, res, next) => {
      if (!roles.includes(req.userRole)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso'
        });
      }
      next();
    };
  }

  // Cierre de sesión (sin cambios)
  async logout(req, res) {
    try {
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new AuthController();