const ExcelJS = require('exceljs');

class ExcelService {
  static async generateSalesReport(reportData, period) {
    const workbook = new ExcelJS.Workbook();
    
    // Hoja de Resumen Ejecutivo
    const summarySheet = workbook.addWorksheet('Resumen Ejecutivo');
    
    // Estilos
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E86AB' } },
      alignment: { horizontal: 'center', vertical: 'middle' }
    };

    const titleStyle = {
      font: { bold: true, size: 16, color: { argb: '2E86AB' } },
      alignment: { horizontal: 'center' }
    };

    const moneyStyle = {
      numFmt: '"Q"#,##0.00'
    };

    // Título
    summarySheet.mergeCells('A1:F1');
    summarySheet.getCell('A1').value = `REPORTE DE VENTAS - ${period.toUpperCase()}`;
    summarySheet.getCell('A1').style = titleStyle;

    // Metadatos
    summarySheet.getCell('A3').value = 'Período:';
    summarySheet.getCell('B3').value = reportData.metadata.period;
    summarySheet.getCell('A4').value = 'Generado:';
    summarySheet.getCell('B4').value = reportData.metadata.generatedAt;
    summarySheet.getCell('A5').value = 'Rango:';
    summarySheet.getCell('B5').value = `${reportData.metadata.dateRange.start} - ${reportData.metadata.dateRange.end}`;

    // Estadísticas principales
    const statsStartRow = 7;
    summarySheet.mergeCells(`A${statsStartRow}:F${statsStartRow}`);
    summarySheet.getCell(`A${statsStartRow}`).value = 'ESTADÍSTICAS PRINCIPALES';
    summarySheet.getCell(`A${statsStartRow}`).style = headerStyle;

    const statsHeaders = ['Métrica', 'Valor', 'Detalles'];
    statsHeaders.forEach((header, index) => {
      summarySheet.getCell(statsStartRow + 1, index + 1).value = header;
      summarySheet.getCell(statsStartRow + 1, index + 1).style = headerStyle;
    });

    const statsData = [
      ['Ventas Totales', reportData.stats.totalSales, `Q${reportData.stats.totalSales.toLocaleString('es-GT')}`],
      ['Boletos Vendidos', reportData.stats.totalTickets, `${reportData.stats.totalTickets.toLocaleString('es-GT')} unidades`],
      ['Precio Promedio', reportData.stats.averagePrice, `Q${reportData.stats.averagePrice.toFixed(2)} por boleto`],
      ['Películas Activas', reportData.stats.activeMovies, `${reportData.stats.activeMovies} en cartelera`]
    ];

    statsData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const cellRef = summarySheet.getCell(statsStartRow + 2 + rowIndex, colIndex + 1);
        cellRef.value = cell;
        if (colIndex === 1 && rowIndex !== 2) { // Aplicar formato monetario excepto para boletos
          cellRef.style = moneyStyle;
        }
      });
    });

    // Hoja de Ventas por Película
    const moviesSheet = workbook.addWorksheet('Ventas por Película');
    
    moviesSheet.getCell('A1').value = 'VENTAS POR PELÍCULA';
    moviesSheet.getCell('A1').style = titleStyle;
    
    const movieHeaders = ['Película', 'Ventas (Q)', 'Boletos', 'Ventas Promedio'];
    movieHeaders.forEach((header, index) => {
      moviesSheet.getCell(3, index + 1).value = header;
      moviesSheet.getCell(3, index + 1).style = headerStyle;
    });

    reportData.salesByMovie.forEach((movie, index) => {
      const row = index + 4;
      moviesSheet.getCell(row, 1).value = movie.movieTitle;
      moviesSheet.getCell(row, 2).value = movie.totalSales;
      moviesSheet.getCell(row, 2).style = moneyStyle;
      moviesSheet.getCell(row, 3).value = movie.ticketCount;
      moviesSheet.getCell(row, 4).value = movie.ticketCount > 0 ? movie.totalSales / movie.ticketCount : 0;
      moviesSheet.getCell(row, 4).style = moneyStyle;
    });

    // Hoja de Tendencias Diarias
    const trendsSheet = workbook.addWorksheet('Tendencias Diarias');
    
    trendsSheet.getCell('A1').value = 'TENDENCIAS DIARIAS DE VENTAS';
    trendsSheet.getCell('A1').style = titleStyle;
    
    const trendsHeaders = ['Fecha', 'Ventas (Q)', 'Boletos Vendidos'];
    trendsHeaders.forEach((header, index) => {
      trendsSheet.getCell(3, index + 1).value = header;
      trendsSheet.getCell(3, index + 1).style = headerStyle;
    });

    reportData.dailyTrends.forEach((trend, index) => {
      const row = index + 4;
      trendsSheet.getCell(row, 1).value = trend.fecha;
      trendsSheet.getCell(row, 2).value = trend.ventas;
      trendsSheet.getCell(row, 2).style = moneyStyle;
      trendsSheet.getCell(row, 3).value = trend.boletos;
    });

    // Hoja de Distribución por Género
    const genreSheet = workbook.addWorksheet('Distribución por Género');
    
    genreSheet.getCell('A1').value = 'DISTRIBUCIÓN POR GÉNERO';
    genreSheet.getCell('A1').style = titleStyle;
    
    const genreHeaders = ['Género', 'Porcentaje (%)', 'Distribución'];
    genreHeaders.forEach((header, index) => {
      genreSheet.getCell(3, index + 1).value = header;
      genreSheet.getCell(3, index + 1).style = headerStyle;
    });

    reportData.genreDistribution.forEach((genre, index) => {
      const row = index + 4;
      genreSheet.getCell(row, 1).value = genre.name;
      genreSheet.getCell(row, 2).value = genre.value;
      genreSheet.getCell(row, 3).value = `${genre.value}%`;
    });

    // Ajustar anchos de columnas
    [summarySheet, moviesSheet, trendsSheet, genreSheet].forEach(sheet => {
      sheet.columns.forEach(column => {
        column.width = 20;
      });
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

module.exports = ExcelService;