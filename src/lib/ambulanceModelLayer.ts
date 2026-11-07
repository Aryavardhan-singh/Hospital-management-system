import { MercatorCoordinate, type CustomLayerInterface, type CustomRenderMethodInput, type Map as MapLibreMap } from 'maplibre-gl'
import type * as Three from 'three'

export interface AmbulanceModelPosition {
  longitude: number
  latitude: number
  heading: number
}

export interface AmbulanceModelLayer extends CustomLayerInterface {
  updatePosition: (position: AmbulanceModelPosition) => void
  setVisible: (visible: boolean) => void
}

function createAmbulanceMesh(three: typeof Three) {
  const vehicle = new three.Group()
  const white = new three.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.62, metalness: 0.06 })
  const red = new three.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 })
  const glass = new three.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.28, metalness: 0.12 })
  const dark = new three.MeshStandardMaterial({ color: 0x172033, roughness: 0.85 })
  const chrome = new three.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.65, roughness: 0.3 })

  const addBox = (
    width: number,
    length: number,
    height: number,
    material: Three.Material,
    x: number,
    y: number,
    z: number
  ) => {
    const mesh = new three.Mesh(new three.BoxGeometry(width, length, height), material)
    mesh.position.set(x, y, z)
    vehicle.add(mesh)
    return mesh
  }

  addBox(4.45, 1.82, 1.42, white, -0.02, 0, 1.05)
  addBox(1.5, 1.78, 1.34, white, 1.32, 0, 1.12)
  addBox(0.07, 1.28, 0.73, glass, 2.08, 0, 1.42)
  addBox(1.05, 0.08, 0.57, glass, 1.28, -0.91, 1.52)
  addBox(1.05, 0.08, 0.57, glass, 1.28, 0.91, 1.52)
  addBox(0.16, 1.88, 0.34, red, -0.18, -0.93, 1.12)
  addBox(0.16, 1.88, 0.34, red, -0.18, 0.93, 1.12)
  addBox(0.1, 0.54, 0.15, red, 0.15, -0.04, 1.86)
  addBox(0.1, 0.54, 0.15, glass, 0.77, -0.04, 1.86)
  addBox(0.18, 1.92, 0.16, chrome, -2.25, 0, 0.68)
  addBox(0.16, 1.92, 0.16, chrome, 2.25, 0, 0.7)

  const wheelGeometry = new three.CylinderGeometry(0.38, 0.38, 0.2, 16)
  const hubGeometry = new three.CylinderGeometry(0.16, 0.16, 0.215, 12)
  for (const x of [-1.42, 1.35]) {
    for (const y of [-0.91, 0.91]) {
      const wheel = new three.Mesh(wheelGeometry, dark)
      wheel.position.set(x, y, 0.42)
      vehicle.add(wheel)
      const hub = new three.Mesh(hubGeometry, chrome)
      hub.position.set(x, y * 1.06, 0.42)
      vehicle.add(hub)
    }
  }

  return vehicle
}

export function createAmbulanceModelLayer(): AmbulanceModelLayer {
  let map: MapLibreMap | null = null
  let three: typeof Three | null = null
  let scene: Three.Scene | null = null
  let camera: Three.Camera | null = null
  let renderer: Three.WebGLRenderer | null = null
  let vehicle: Three.Group | null = null
  let position: AmbulanceModelPosition | null = null
  let visible = false

  return {
    id: 'citizen-live-ambulance-model',
    type: 'custom',
    renderingMode: '3d',
    updatePosition(nextPosition) {
      position = nextPosition
      map?.triggerRepaint()
    },
    setVisible(nextVisible) {
      visible = nextVisible
      map?.triggerRepaint()
    },
    onAdd(mapInstance, gl) {
      map = mapInstance
      void import('three').then((threeModule) => {
        if (!map) return
        three = threeModule
        scene = new three.Scene()
        camera = new three.Camera()
        renderer = new three.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
        })
        renderer.autoClear = false
        scene.add(new three.AmbientLight(0xffffff, 1.8))
        const keyLight = new three.DirectionalLight(0xffffff, 2.4)
        keyLight.position.set(-4, -6, 12)
        scene.add(keyLight)
        vehicle = createAmbulanceMesh(three)
        scene.add(vehicle)
        map.triggerRepaint()
      })
    },
    render(_gl, options: CustomRenderMethodInput) {
      if (!three || !scene || !camera || !renderer || !vehicle || !position || !visible) return

      const terrainHeight = map?.queryTerrainElevation([position.longitude, position.latitude]) ?? 0
      const coordinate = MercatorCoordinate.fromLngLat(
        [position.longitude, position.latitude],
        terrainHeight + 2.5
      )
      const metersToMercator = coordinate.meterInMercatorCoordinateUnits()
      const markerScale = metersToMercator * 14
      const projection = new three.Matrix4().fromArray(
        Array.from(options.defaultProjectionData.mainMatrix)
      )
      const localTransform = new three.Matrix4()
        .makeTranslation(coordinate.x, coordinate.y, coordinate.z)
        .multiply(new three.Matrix4().makeScale(markerScale, -markerScale, markerScale))
        .multiply(new three.Matrix4().makeRotationZ((position.heading * Math.PI) / 180 - Math.PI / 2))

      camera.projectionMatrix.copy(projection.multiply(localTransform))
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
      renderer.resetState()
      renderer.render(scene, camera)
    },
    onRemove() {
      const activeThree = three
      if (scene && activeThree) {
        scene.traverse((object) => {
          if (object instanceof activeThree.Mesh) {
            object.geometry.dispose()
            const materials = Array.isArray(object.material) ? object.material : [object.material]
            materials.forEach((material) => material.dispose())
          }
        })
      }
      renderer?.dispose()
      map = null
      three = null
      scene = null
      camera = null
      renderer = null
      vehicle = null
    },
  }
}
